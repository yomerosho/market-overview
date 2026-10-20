"""Read-only historical scan of Kalshi for "sum-under-$1" arbitrage.

For each settled, exhaustive game-winner event (one YES market per team), align
the legs' 1-minute candles and ask: at the end of this minute, could you have
bought YES on every outcome for less than $1.00 after fees?

No login, no keys, no orders: only public market-data GETs. Every response is
cached in SQLite, so reruns refetch nothing but the settled-market listings
(which grow as games finish).

Results are an UPPER BOUND. Candles give top-of-book price, never depth: a bar
showing a 45c ask may have had one contract behind it. Thin-leg volume is
reported as the only size proxy there is.

    python kalshi_arb/scan.py                       # NFL + NBA, last 90 days
    python kalshi_arb/scan.py --since 2026-04-15 --until 2026-06-30 --series KXNBAGAME --tag nba-playoffs
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import sqlite3
import statistics
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fractions import Fraction
from pathlib import Path

import requests

API = "https://api.elections.kalshi.com/trade-api/v2"
HERE = Path(__file__).resolve().parent

SERIES = {"KXNFLGAME": "NFL", "KXNBAGAME": "NBA"}

# Fee per contract = ceil-to-cent(rate * P * (1 - P)). The API confirms both
# series are fee_type "quadratic_with_maker_fees", multiplier 1, unchanged since
# 2026-01-01 (GET /series/{t} and /series/fee_changes). The 0.07 / 0.0175
# coefficients themselves are NOT in the API and could not be checked against
# kalshi.com/fee-schedule from here -- see the summary's "not verified" list.
TAKER_RATE = Fraction(7, 100)
MAKER_RATE = Fraction(7, 400)  # 25% of taker

GROSS_THRESHOLD = Fraction(93, 100)
MAX_CANDLES = 5000  # the API rejects longer ranges
MIN_INTERVAL = 0.25  # seconds between requests: the public tier 429s at ~5/s
LIST_TTL = 6 * 3600  # settled-market listings grow; candles of settled markets don't


# --- HTTP + cache ----------------------------------------------------------


class FetchError(RuntimeError):
    pass


class Client:
    def __init__(self, cache_path: Path, refresh_lists: bool = False, offline: bool = False):
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(cache_path)
        self.db.execute(
            "CREATE TABLE IF NOT EXISTS http (key TEXT PRIMARY KEY, status INTEGER, body TEXT, fetched_at REAL)"
        )
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "kalshi-arb-historical-scan (read-only research)"
        self.refresh_lists = refresh_lists
        self.offline = offline
        self.last = 0.0
        self.interval = MIN_INTERVAL  # grows on 429, decays back on success
        self.fetched = 0
        self.cached = 0

    def get(self, path: str, ttl: float | None = None, **params) -> tuple[int, dict]:
        """GET with cache. ttl=None caches forever; 4xx bodies are cached too so a
        dead ticker isn't retried every run."""
        params = {k: v for k, v in params.items() if v is not None}
        key = path + "?" + "&".join(f"{k}={params[k]}" for k in sorted(params))
        row = self.db.execute("SELECT status, body, fetched_at FROM http WHERE key=?", (key,)).fetchone()
        if row and (self.offline or not (ttl is not None and (self.refresh_lists or time.time() - row[2] > ttl))):
            self.cached += 1
            return row[0], json.loads(row[1])
        if self.offline:
            raise FetchError(f"not cached: {key}")

        for attempt in range(12):
            wait = self.interval - (time.time() - self.last)
            if wait > 0:
                time.sleep(wait)
            self.last = time.time()
            try:
                r = self.session.get(API + path, params=params, timeout=60)
            except requests.RequestException as e:
                err = e
            else:
                if r.status_code < 500 and r.status_code != 429:
                    body = r.json() if r.content else {}
                    if r.status_code < 400 or r.status_code in (400, 404):
                        self.db.execute(
                            "INSERT OR REPLACE INTO http VALUES (?,?,?,?)",
                            (key, r.status_code, json.dumps(body), time.time()),
                        )
                        self.db.commit()
                    self.fetched += 1
                    self.interval = max(MIN_INTERVAL, self.interval * 0.8)
                    return r.status_code, body
                err = f"HTTP {r.status_code}"
                if r.status_code == 429:
                    self.interval = min(2.0, self.interval * 1.5)
            retry_after = r.headers.get("Retry-After") if isinstance(err, str) else None
            delay = float(retry_after) if retry_after and retry_after.isdigit() else min(120, 2**attempt) + random.random()
            print(f"  retry {attempt + 1} for {path} ({err}); sleeping {delay:.1f}s", file=sys.stderr)
            time.sleep(delay)
        raise FetchError(f"giving up on {key}")

    def paginate(self, path: str, key: str, ttl: float | None, **params):
        cursor = None
        while True:
            status, body = self.get(path, ttl=ttl, limit=1000, cursor=cursor, **params)
            if status != 200:
                raise RuntimeError(f"{path} -> {status}: {body}")
            yield from body.get(key) or []
            cursor = body.get("cursor")
            if not cursor:
                return


# --- helpers ----------------------------------------------------------------


def ts(s: str) -> int:
    return int(datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp())


def iso(t: int) -> str:
    return datetime.fromtimestamp(t, timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def dollars(d: dict | None, field: str) -> Fraction | None:
    """Historical candles say `close`, live ones `close_dollars`."""
    if not d:
        return None
    v = d.get(field + "_dollars", d.get(field))
    return Fraction(v) if v not in (None, "") else None


def fp(d: dict, field: str) -> Fraction:
    v = d.get(field + "_fp", d.get(field))
    return Fraction(v) if v not in (None, "") else Fraction(0)


def fee(p: Fraction, rate: Fraction) -> Fraction:
    """ceil-to-cent(rate * P * (1-P)) for one contract, in dollars."""
    cents = rate * p * (1 - p) * 100
    return Fraction(-(-cents.numerator // cents.denominator), 100)


def f(x: Fraction | None, nd: int = 4) -> str:
    return "" if x is None else f"{float(x):.{nd}f}"


def week_of(t: int) -> str:
    y, w, _ = datetime.fromtimestamp(t, timezone.utc).isocalendar()
    return f"{y}-W{w:02d}"


# --- markets ----------------------------------------------------------------


def settled_markets(c: Client, series: str, since: int, until: int, cutoff: int) -> dict[str, dict]:
    """Both sides of the historical cutoff: /historical/markets for markets
    settled before it, /markets?status=settled for the rest. Deduped by ticker."""
    out: dict[str, dict] = {}
    for m in c.paginate("/historical/markets", "markets", LIST_TTL, series_ticker=series):
        if since <= ts(m["close_time"]) <= until:
            out[m["ticker"]] = {**m, "_source": "historical"}
    for m in c.paginate(
        "/markets", "markets", LIST_TTL, series_ticker=series, status="settled",
        min_close_ts=since, max_close_ts=until,
    ):
        if since <= ts(m["close_time"]) <= until:
            out.setdefault(m["ticker"], {**m, "_source": "live"})
    return out


def validate_event(legs: list[dict]) -> str | None:
    """None if the event is a clean, exhaustive, mutually-exclusive set of legs;
    otherwise the reason it was skipped."""
    if any(m["ticker"].startswith("KXMVE") for m in legs):
        return "multivariate/combo"
    if len(legs) != 2:
        return f"{len(legs)} legs (game winner should have 2)"
    if any(m.get("market_type") != "binary" for m in legs):
        return "non-binary leg"
    if any(m.get("status") not in ("finalized", "settled") for m in legs):
        return "not finalized: " + ",".join(m.get("status", "?") for m in legs)
    subs = [m.get("yes_sub_title") or m["ticker"].rsplit("-", 1)[-1] for m in legs]
    if len(set(subs)) != len(subs):
        return "legs name the same outcome"
    vals = [m.get("settlement_value_dollars") for m in legs]
    if any(v in (None, "") for v in vals):
        return "missing settlement value"
    total = sum(Fraction(v) for v in vals)
    if total != 1:
        # e.g. postponed game resolved "to a fair market price"
        return f"settlement values sum to {float(total):.4f}, not 1.00"
    return None


def candles(c: Client, m: dict, cutoff: int) -> list[dict]:
    t, series = m["ticker"], m["ticker"].split("-", 1)[0]
    start, end = ts(m["open_time"]), ts(m["close_time"])
    settled = ts(m["settlement_ts"]) if m.get("settlement_ts") else end
    paths = [f"/historical/markets/{t}/candlesticks", f"/series/{series}/markets/{t}/candlesticks"]
    if settled >= cutoff:
        paths.reverse()
    for path in paths:
        bars: list[dict] = []
        ok = True
        lo = start - start % 60
        while lo < end:
            hi = min(end, lo + (MAX_CANDLES - 1) * 60)
            status, body = c.get(path, start_ts=lo, end_ts=hi, period_interval=1)
            if status != 200:
                ok = False
                break
            bars.extend(body.get("candlesticks") or [])
            lo = hi
        if ok and bars:
            seen, uniq = set(), []
            for b in sorted(bars, key=lambda b: b["end_period_ts"]):
                if b["end_period_ts"] not in seen and b["end_period_ts"] <= end:
                    seen.add(b["end_period_ts"])
                    uniq.append(b)
            return uniq
    return []


# --- the scan ---------------------------------------------------------------


def align(leg_bars: list[list[dict]], max_fill: int):
    """Yield (t, [(ask, volume, filled) per leg]) on a 1-minute grid. A leg with
    no bar this minute carries its last ask for up to max_fill minutes (a
    missing bar means no activity, not no quote); beyond that the minute is
    dropped. Volume on a carried minute is 0."""
    idx = [{b["end_period_ts"]: b for b in bars} for bars in leg_bars]
    if not all(idx):
        return
    t0 = max(min(i) for i in idx)
    t1 = min(max(i) for i in idx)
    last: list[tuple[int, Fraction] | None] = [None] * len(idx)
    for i, bars in enumerate(idx):  # seed with each leg's last bar at/before t0
        prior = [t for t in bars if t <= t0]
        if prior:
            a = dollars(bars[max(prior)].get("yes_ask"), "close")
            last[i] = (max(prior), a) if a else None
    for t in range(t0, t1 + 1, 60):
        row = []
        for i, bars in enumerate(idx):
            b = bars.get(t)
            if b is not None:
                a = dollars(b.get("yes_ask"), "close")
                last[i] = (t, a) if a else None
                row.append((a, fp(b, "volume"), False) if a else None)
            elif last[i] and t - last[i][0] <= max_fill * 60:
                row.append((last[i][1], Fraction(0), True))
            else:
                row.append(None)
        if all(row):
            yield t, row


def runs_of(ts_list: list[int]) -> list[list[int]]:
    runs: list[list[int]] = []
    for t in ts_list:
        if runs and t - runs[-1][-1] == 60:
            runs[-1].append(t)
        else:
            runs.append([t])
    return runs


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    now = datetime.now(timezone.utc)
    ap.add_argument("--since", default=(now - timedelta(days=90)).strftime("%Y-%m-%d"))
    ap.add_argument("--until", default=now.strftime("%Y-%m-%d"))
    ap.add_argument("--series", nargs="+", default=list(SERIES))
    ap.add_argument("--max-fill", type=int, default=5, help="minutes a leg's last ask may be carried forward")
    ap.add_argument("--tag", default="last90", help="output subfolder name")
    ap.add_argument("--refresh-lists", action="store_true", help="refetch settled-market listings now")
    ap.add_argument("--offline", action="store_true", help="use only cached responses; uncached events are skipped")
    ap.add_argument("--cache", default=str(HERE / ".cache" / "kalshi.sqlite"))
    args = ap.parse_args()

    since = ts(args.since + "T00:00:00Z")
    until = ts(args.until + "T23:59:59Z")
    out_dir = HERE / "out" / args.tag
    out_dir.mkdir(parents=True, exist_ok=True)
    c = Client(Path(args.cache), args.refresh_lists, args.offline)

    status, cut = c.get("/historical/cutoff", ttl=LIST_TTL)
    cutoff = ts(cut["market_settled_ts"])
    fees_seen = {}
    for s in args.series:
        _, sr = c.get(f"/series/{s}", ttl=LIST_TTL)
        _, ch = c.get("/series/fee_changes", ttl=LIST_TTL, series_ticker=s, show_historical="true")
        fees_seen[s] = {
            "fee_type": sr["series"].get("fee_type"),
            "fee_multiplier": sr["series"].get("fee_multiplier"),
            "changes": [(x["scheduled_ts"], x["fee_type"], x["fee_multiplier"]) for x in ch.get("series_fee_change_arr") or []],
        }
    print(f"window {args.since} .. {args.until}; historical cutoff {cut['market_settled_ts']}")
    for s, fs in fees_seen.items():
        print(f"  {s}: fee_type={fs['fee_type']} multiplier={fs['fee_multiplier']} changes={fs['changes']}")

    opp_bars, run_rows, skipped, scanned = [], [], [], []
    for series in args.series:
        cat = SERIES.get(series, series)
        try:
            markets = settled_markets(c, series, since, until, cutoff)
        except FetchError as e:
            print(f"{series}: listing unavailable ({e}); skipped")
            skipped.append({"category": cat, "event": "(all)", "reason": f"listing unavailable: {e}"})
            continue
        events = defaultdict(list)
        for m in markets.values():
            events[m["event_ticker"]].append(m)
        n_hist = sum(1 for m in markets.values() if m["_source"] == "historical")
        print(f"{series}: {len(markets)} settled markets ({n_hist} historical, {len(markets) - n_hist} live), {len(events)} events")

        for k, (ev, legs) in enumerate(sorted(events.items()), 1):
            legs.sort(key=lambda m: m["ticker"])
            why = validate_event(legs)
            if why:
                skipped.append({"category": cat, "event": ev, "reason": why})
                continue
            try:
                leg_bars = [candles(c, m, cutoff) for m in legs]
            except FetchError as e:  # not cached, so a rerun retries just these
                skipped.append({"category": cat, "event": ev, "reason": f"fetch failed or not cached (rerun to retry): {e}"})
                continue
            if not all(leg_bars):
                skipped.append({"category": cat, "event": ev, "reason": "no candles for a leg"})
                continue
            tie = all(Fraction(m["settlement_value_dollars"]) == Fraction(1, 2) for m in legs)
            n_bars = 0
            hit_g, hit_n = [], []
            rows = {}
            grosses, nets = [], []
            for t, row in align(leg_bars, args.max_fill):
                n_bars += 1
                asks = [a for a, _, _ in row]
                gross = sum(asks)
                taker = sum(fee(a, TAKER_RATE) for a in asks)
                maker = sum(fee(a, MAKER_RATE) for a in asks)
                net = 1 - gross - taker
                grosses.append(gross)
                nets.append(net)
                if gross <= GROSS_THRESHOLD or net > 0:
                    rows[t] = (row, gross, taker, net, 1 - gross - maker)
                    if gross <= GROSS_THRESHOLD:
                        hit_g.append(t)
                    if net > 0:
                        hit_n.append(t)
            scanned.append({
                "category": cat, "event": ev, "bars": n_bars, "tie": tie,
                "min_gross_sum": f(min(grosses)) if grosses else "",
                "median_gross_sum": f(statistics.median(grosses)) if grosses else "",
                "max_net_edge": f(max(nets)) if nets else "",
            })
            for t, (row, gross, taker, net, net_m) in rows.items():
                opp_bars.append({
                    "category": cat, "week": week_of(t), "event": ev, "time_utc": iso(t),
                    **{f"leg{i + 1}": legs[i]["ticker"] for i in range(len(legs))},
                    **{f"ask{i + 1}": f(row[i][0]) for i in range(len(legs))},
                    "gross_sum": f(gross), "taker_fees": f(taker), "net_edge": f(net),
                    "net_edge_if_maker_fees": f(net_m),
                    "thin_leg_volume": f(min(v for _, v, _ in row), 2),
                    "quote_carried_forward": any(fl for _, _, fl in row),
                    "gross_le_093": gross <= GROSS_THRESHOLD, "net_gt_0": net > 0,
                })
            for kind, hits in (("gross<=0.93", hit_g), ("net>0", hit_n)):
                for r in runs_of(hits):
                    vols = [sum(rows[t][0][i][1] for t in r) for i in range(len(legs))]
                    run_rows.append({
                        "category": cat, "week": week_of(r[0]), "event": ev, "definition": kind,
                        "start_utc": iso(r[0]), "end_utc": iso(r[-1]), "minutes": len(r),
                        "min_gross_sum": f(min(rows[t][1] for t in r)),
                        "max_net_edge": f(max(rows[t][3] for t in r)),
                        "thin_leg_volume_during_run": f(min(vols), 2),
                        "minutes_with_carried_quote": sum(1 for t in r if any(x[2] for x in rows[t][0])),
                    })
            if k % 25 == 0:
                print(f"  {series}: {k}/{len(events)} events  (fetched {c.fetched}, cached {c.cached})")

    write_outputs(out_dir, args, cut, fees_seen, scanned, skipped, opp_bars, run_rows)
    print(f"requests: {c.fetched} fetched, {c.cached} from cache")


def write_csv(path: Path, rows: list[dict], fields: list[str] | None = None) -> None:
    fields = fields or (list(rows[0]) if rows else ["(none)"])
    with path.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)


def write_outputs(out_dir, args, cut, fees_seen, scanned, skipped, opp_bars, run_rows) -> None:
    weekly = defaultdict(lambda: {"bars_gross_le_093": 0, "events_gross_le_093": set(),
                                  "bars_net_gt_0": 0, "events_net_gt_0": set(), "thin": []})
    for b in opp_bars:
        w = weekly[(b["week"], b["category"])]
        if b["gross_le_093"]:
            w["bars_gross_le_093"] += 1
            w["events_gross_le_093"].add(b["event"])
        if b["net_gt_0"]:
            w["bars_net_gt_0"] += 1
            w["events_net_gt_0"].add(b["event"])
            w["thin"].append(float(b["thin_leg_volume"]))
    weekly_rows = []
    for (wk, cat), w in sorted(weekly.items()):
        net_runs = [r["minutes"] for r in run_rows if r["week"] == wk and r["category"] == cat and r["definition"] == "net>0"]
        weekly_rows.append({
            "week": wk, "category": cat,
            "event_bars_gross_le_093": w["bars_gross_le_093"],
            "distinct_events_gross_le_093": len(w["events_gross_le_093"]),
            "event_bars_net_edge_gt_0": w["bars_net_gt_0"],
            "distinct_events_net_edge_gt_0": len(w["events_net_gt_0"]),
            "net_gt_0_runs": len(net_runs),
            "median_run_minutes": statistics.median(net_runs) if net_runs else "",
            "max_run_minutes": max(net_runs) if net_runs else "",
            "median_thin_leg_volume_per_bar": statistics.median(w["thin"]) if w["thin"] else "",
        })
    write_csv(out_dir / "weekly_summary.csv", weekly_rows)
    write_csv(out_dir / "opportunity_bars.csv", opp_bars)
    write_csv(out_dir / "opportunity_runs.csv", run_rows)
    write_csv(out_dir / "events_scanned.csv", scanned)
    write_csv(out_dir / "events_skipped.csv", skipped, ["category", "event", "reason"])

    lines = [
        f"# Kalshi sum-under-$1 scan: {args.since} to {args.until}",
        "",
        "**UPPER BOUND.** Prices are the top-of-book YES ask at the close of each 1-minute",
        "candle. Kalshi publishes no historical order-book depth, so none of this says how",
        "many contracts were actually available at those asks. Thin-leg traded volume is",
        "the only size proxy.",
        "",
        f"Series: {', '.join(args.series)}. Historical cutoff: {cut['market_settled_ts']}",
        "(markets settled before it come from `/historical/*`, the rest from the live endpoints).",
        f"Last-quote carry-forward cap: {args.max_fill} min.",
        "",
        "## Totals",
        "",
        "| category | events scanned | skipped | bars scanned | bars gross<=0.93 | events gross<=0.93 | bars net>0 | events net>0 | net>0 runs | median run (min) | max run (min) |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for cat in sorted({e["category"] for e in scanned} | {e["category"] for e in skipped}):
        sc = [e for e in scanned if e["category"] == cat]
        ob = [b for b in opp_bars if b["category"] == cat]
        nr = [r["minutes"] for r in run_rows if r["category"] == cat and r["definition"] == "net>0"]
        lines.append(
            f"| {cat} | {len(sc)} | {sum(1 for e in skipped if e['category'] == cat)} | {sum(e['bars'] for e in sc)} "
            f"| {sum(b['gross_le_093'] for b in ob)} | {len({b['event'] for b in ob if b['gross_le_093']})} "
            f"| {sum(b['net_gt_0'] for b in ob)} | {len({b['event'] for b in ob if b['net_gt_0']})} "
            f"| {len(nr)} | {statistics.median(nr) if nr else '-'} | {max(nr) if nr else '-'} |"
        )
    carried = sum(1 for b in opp_bars if b["net_gt_0"] and b["quote_carried_forward"])
    lines += [
        "",
        f"Of the net>0 bars, {carried} relied on at least one leg's ask carried forward from an earlier minute.",
        "",
        "## Largest net>0 runs",
        "",
        "| event | start (UTC) | minutes | min gross | max net edge | thin-leg volume |",
        "|---|---|---|---|---|---|",
    ]
    top = sorted((r for r in run_rows if r["definition"] == "net>0"), key=lambda r: -float(r["max_net_edge"]))[:15]
    for r in top:
        lines.append(f"| {r['event']} | {r['start_utc']} | {r['minutes']} | {r['min_gross_sum']} | {r['max_net_edge']} | {r['thin_leg_volume_during_run']} |")
    reasons = defaultdict(int)
    for s in skipped:
        reasons[s["reason"].split(":")[0]] += 1
    lines += ["", "## Skipped events", ""] + [f"- {n} x {r}" for r, n in sorted(reasons.items(), key=lambda x: -x[1])]
    lines += [
        "",
        "## Method",
        "",
        "- Event = one game; legs = the two team-wins YES markets. Kept only if both are binary,",
        "  finalized, name different teams, and their settlement values sum to exactly $1.00",
        "  (a tie pays $0.50 + $0.50, still exhaustive). Anything else is skipped and listed.",
        "- Every bar: gross_sum = sum of legs' YES ask (candle close); taker fee per leg =",
        "  ceil-to-cent(0.07 * P * (1-P)) for one contract; net_edge = 1 - gross_sum - fees.",
        "  `net_edge_if_maker_fees` uses 0.0175 for reference only: lifting asks is taking.",
        "- A run = consecutive minutes meeting the condition. Thin-leg volume during a run is",
        "  the smaller of the legs' summed traded volume across the run.",
        "",
        "## Fees as reported by the API",
        "",
    ] + [f"- {s}: `{v['fee_type']}`, multiplier {v['fee_multiplier']}, changes {v['changes']}" for s, v in fees_seen.items()] + [
        "",
        "## Not verified",
        "",
        "- The 0.07 taker / 0.0175 maker coefficients and the rounding rule: kalshi.com/fee-schedule",
        "  could not be read from the scan environment. Only the fee *type* came from the API.",
        "  Kalshi also rounds fees per order, not per contract; at size the per-contract fee is lower",
        "  than ceil-to-cent of one contract, so net_edge here is conservative on fees.",
        "- Candle close is the ask at the end of the minute; legs are simultaneous only to that",
        "  resolution. A minute with no candle is filled with the last ask (see carry-forward count).",
        "- Every game's rules allow resolution 'to a fair market price' if the game is not played",
        "  within 48h. That is real ex-ante risk to the 'riskless' arb even though no scanned event",
        "  settled that way.",
        "- No depth: an ask is assumed fillable for at least one contract.",
    ]
    (out_dir / "SUMMARY.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:20]))
    print(f"wrote {out_dir}")


if __name__ == "__main__":
    main()
