"""
brief.py
--------
The facts, and the model that writes them up.

The split is the whole point. `gather()` is deterministic -- it reads the
scanner's published latest_scan.json, overlays live prices, and it is the only
thing here that decides what is TRUE. `write()` hands those facts to Claude and
asks for prose.

Claude never fetches, never derives a level, and never sees a symbol we didn't
hand it. So if the brief says something wrong, the bug is in gather() or in the
scanner -- not in the prompt. A brief that quietly invents a level is worse than
no brief.

RELATIONSHIP TO THE SCANNER
===========================
One direction, one seam: this app CONSUMES latest_scan.json, a published
artifact. It imports no scanner code and shares no modules. The scanner does not
know this app exists, and can be refactored freely as long as the JSON keeps its
shape. If that file's schema changes, `_trim_level` is where it breaks, loudly.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Iterator, Optional

import requests

logger = logging.getLogger("market_brief")

SCAN_URL = (
    "https://raw.githubusercontent.com/yomerosho/strat-alerts/main/latest_scan.json"
)

# The three that set the tone for everything else on the watchlist.
CONTEXT_SYMBOLS: tuple[str, ...] = ("SPY", "QQQ", "IWM")

# The frames worth reading for context, coming into a session.
CONTEXT_TFS: tuple[str, ...] = ("1H", "4H", "1D", "1W")

# Timeframes whose prior extremes act as overnight/intraday magnets.
MAGNET_TFS: tuple[str, ...] = ("4H", "1D", "1W")

MODEL = "claude-opus-4-8"


# --------------------------------------------------------------------------
# the scan
# --------------------------------------------------------------------------

def load_scan(nocache: int, url: str = SCAN_URL) -> dict:
    r = requests.get(f"{url}?nocache={nocache}", timeout=20)
    r.raise_for_status()
    return r.json()


def _signed_distance_pct(price: float, trigger: float, direction: str) -> Optional[float]:
    """
    Percent from the trigger, signed the way the scanner signs it: POSITIVE
    means price is already through the trigger in the trade's direction,
    negative means it still has to get there.
    """
    if not trigger:
        return None
    gap = (price - trigger) if direction == "bull" else (trigger - price)
    return round(gap / trigger * 100, 3)


def _trim_level(l: dict, live: dict) -> dict:
    """
    The fields that carry the trade. Everything else is scanner bookkeeping and
    only costs tokens.

    Price and distance are refreshed from the live trade where we have one. TIER
    is deliberately NOT recomputed: promoting ARMED -> TIER1 -> TIER2 requires
    knowing whether a 15-minute bar has closed through the level, which is the
    scanner's job and needs bar data we don't have here. Guessing it from a last
    trade would invent entries that never confirmed.
    """
    d = l.get("decision") or {}
    sym = l.get("symbol")
    direction = l.get("direction")
    trigger = l.get("level")

    out = {
        "symbol": sym,
        "setup_tf": l.get("setup_tf"),
        "pattern": l.get("pattern"),
        "family": l.get("family"),
        "direction": direction,
        "tier": l.get("tier"),
        "trigger": trigger,
        "trigger_side": l.get("trigger_side"),
        "stop": l.get("invalidation"),
        "scale_level": l.get("scale_level"),
        "runner_target": l.get("target"),
        "price_at_scan": l.get("current_price"),
        "distance_pct_at_scan": l.get("distance_pct"),
        "continuity": l.get("continuity"),
        "score": d.get("score"),
        "runway_r": d.get("runway_r"),
        "ftfc_aligned": d.get("ftfc_aligned"),
        "compressed": d.get("compressed"),
        "minutes_to_next_15m": l.get("minutes_to_next_15m"),
        "setup_bar_closes_at": l.get("setup_bar_closes_at"),
    }

    q = live.get(sym)
    if q and trigger:
        out["live_price"] = q["price"]
        out["live_price_at"] = q["at"]
        out["live_distance_pct"] = _signed_distance_pct(q["price"], trigger, direction)
    return out


def _tf_map(tf_state: dict, price: float) -> dict:
    """
    What the next bar of this timeframe opens as, given where price sits against
    the last closed bar's extremes -- and which Failed-2 that sets up.

    Above the prior high -> opens 2U; failing back = F2D.
    Below the prior low  -> opens 2D; reclaiming  = F2U.
    Inside the range     -> opens 1; watch the edges.

    This is a comparison against numbers the scan already published, not a
    re-derivation of the bars themselves.
    """
    hi, lo = tf_state.get("high"), tf_state.get("low")
    labels = tf_state.get("labels") or []
    last_label = labels[-1] if labels else None
    inside = last_label == "1"

    base = {
        "prior_high": hi,
        "prior_low": lo,
        "last_closed_label": last_label,
        "recent_labels": labels,
        "prior_bar_was_inside": inside,
        "last_bar": tf_state.get("last_bar"),
    }
    if hi is None or lo is None or price is None:
        return {**base, "opens_as": None, "sets_up": None, "f2_trigger": None}
    if price > hi:
        return {**base, "opens_as": "2U", "sets_up": "F2D", "f2_trigger": hi}
    if price < lo:
        return {**base, "opens_as": "2D", "sets_up": "F2U", "f2_trigger": lo}
    return {**base, "opens_as": "1", "sets_up": None, "f2_trigger": None}


def _context(sym_state: dict, live: dict) -> dict:
    """One symbol's map across the context frames, plus its magnets."""
    sym = sym_state.get("symbol")
    tfs = sym_state.get("timeframes") or {}
    scan_price = sym_state.get("price")

    q = live.get(sym)
    price = q["price"] if q else scan_price

    up_mag, dn_mag = [], []
    for tf in MAGNET_TFS:
        st = tfs.get(tf) or {}
        hi, lo = st.get("high"), st.get("low")
        if price is None:
            continue
        if hi is not None and hi > price:
            up_mag.append({"tf": tf, "price": hi})
        if lo is not None and lo < price:
            dn_mag.append({"tf": tf, "price": lo})
    up_mag.sort(key=lambda m: m["price"])           # nearest above first
    dn_mag.sort(key=lambda m: -m["price"])          # nearest below first

    change = None
    if price is not None and scan_price:
        change = round((price - scan_price) / scan_price * 100, 2)

    return {
        "symbol": sym,
        "price": price,
        "price_is_live": bool(q),
        "price_at": q["at"] if q else sym_state.get("scanned_at"),
        "price_at_scan": scan_price,
        "change_since_scan_pct": change,
        "frames": {tf: _tf_map(tfs[tf], price) for tf in CONTEXT_TFS if tf in tfs},
        "magnets_above": up_mag[:3],
        "magnets_below": dn_mag[:3],
    }


_RUNWAY_RE = re.compile(r"nearest gating rung ([\d.]+)R\s*<\s*([\d.]+)R")
_FTFC_RE = re.compile(r"FTFC (\d+)/(\d+) aligned < (\d+)")


def _near_misses(scan: dict, live: dict) -> list[dict]:
    """
    The patterns the scanner FOUND and then threw away, with the gate that
    killed each one. Study material, not trade candidates.

    The scanner records these under each symbol's `rejected` so its own reject
    log can be interrogated -- "a silent scanner you cannot interrogate is
    indistinguishable from a broken one". They carry far less than an armed
    level: pattern, timeframe, direction, trigger, and the reason trail. There
    is no stop, target, scale point or score, because the scanner stops
    computing those the moment a gate fails. So a near miss can be described
    and located, never planned.

    Sorted by how close each came to passing, so the most instructive ones
    ("missed the runway gate by 0.1R") lead.
    """
    out: list[dict] = []
    for sym in scan.get("symbols", []):
        symbol = sym.get("symbol")
        for r in sym.get("rejected", []) or []:
            reasons = r.get("reasons") or []
            gates = sorted({str(x).split(":")[0].strip() for x in reasons})

            runway_r = min_runway = ftfc_aligned = ftfc_needed = None
            for x in reasons:
                m = _RUNWAY_RE.search(str(x))
                if m:
                    runway_r, min_runway = float(m.group(1)), float(m.group(2))
                m = _FTFC_RE.search(str(x))
                if m:
                    ftfc_aligned, ftfc_needed = int(m.group(1)), int(m.group(3))

            # How near it came, as a fraction of what the gate demanded. Only
            # the runway gate gives a clean scalar; FTFC is counts, not a ratio.
            closeness = (runway_r / min_runway) if (runway_r and min_runway) else None

            entry = {
                "symbol": symbol,
                "setup_tf": r.get("setup_tf"),
                "pattern": r.get("pattern"),
                "direction": r.get("direction"),
                "trigger": r.get("level"),
                "failed_gates": gates,
                "reasons": reasons,
                "runway_r": runway_r,
                "runway_required": min_runway,
                "ftfc_aligned": ftfc_aligned,
                "ftfc_required": ftfc_needed,
                "fraction_of_gate_met": round(closeness, 2) if closeness else None,
            }
            q = live.get(symbol)
            if q and r.get("level"):
                entry["live_price"] = q["price"]
                entry["live_distance_pct"] = _signed_distance_pct(
                    q["price"], r["level"], r.get("direction")
                )
            out.append(entry)

    out.sort(key=lambda e: -(e["fraction_of_gate_met"] or 0))
    return out


def _near_miss_summary(near: list[dict]) -> dict:
    """
    Pre-counted aggregates over the near misses.

    This exists because the model gets tallies wrong. Asked to characterise 48
    rejections it wrote "only four setups failed on continuity ... plus RIVN in
    both directions" -- there were five, and RIVN appeared once. No price was
    invented; it simply counted in prose. Counting is the machine's job, so the
    machine does it here and the model is left to say what it means.
    """
    by_gate: dict[str, int] = {}
    by_symbol: dict[str, int] = {}
    by_direction: dict[str, int] = {}
    for e in near:
        for g in e["failed_gates"]:
            by_gate[g] = by_gate.get(g, 0) + 1
        by_symbol[e["symbol"]] = by_symbol.get(e["symbol"], 0) + 1
        if e.get("direction"):
            by_direction[e["direction"]] = by_direction.get(e["direction"], 0) + 1

    # Names rejected in BOTH directions -- the signature of a coiled range,
    # where the same symbol offers a trigger long and short with no room either
    # way. Worth naming explicitly so it isn't inferred by eye.
    dirs: dict[str, set] = {}
    for e in near:
        dirs.setdefault(e["symbol"], set()).add(e.get("direction"))
    both = sorted(s for s, d in dirs.items() if {"bull", "bear"} <= d)

    return {
        "total": len(near),
        "by_failed_gate": dict(sorted(by_gate.items(), key=lambda kv: -kv[1])),
        "by_direction": by_direction,
        "symbols_rejected_both_directions": both,
        "symbols_by_count": dict(sorted(by_symbol.items(), key=lambda kv: -kv[1])[:10]),
        "closest_fraction_of_gate_met": near[0]["fraction_of_gate_met"] if near else None,
    }


# The Strat label of the last CLOSED daily bar, turned into a headline badge.
# Deterministic on purpose: the badge is a claim about structure, and structure
# is something the scan states outright rather than something to be interpreted.
_STATUS = {
    "2U": ("TRENDING UP", "bull"),
    "2D": ("TRENDING DOWN", "bear"),
    "1": ("INSIDE · COILED", "flat"),
    "3": ("OUTSIDE · BROAD", "flat"),
}


def index_cards(facts: dict, snaps: dict) -> list[dict]:
    """
    One card per index, built entirely from data -- no model involved.

    Everything a reader takes as fact (price, percent change, the badge, the
    levels) is computed here. The model is handed these same cards and asked
    only for a paragraph of read per symbol, which is merged in later. That way
    a wrong number is impossible by construction rather than by good behaviour,
    and the audits only ever have to police prose.
    """
    cards = []
    for c in facts.get("index_context", []):
        sym = c["symbol"]
        snap = snaps.get(sym, {})
        daily = c["frames"].get("1D", {})
        four = c["frames"].get("4H", {})

        label = daily.get("last_closed_label")
        status, tone = _STATUS.get(label, ("UNRESOLVED", "flat"))
        # An inside bar on the nominating frame is the coil that matters, even
        # when the daily itself printed a direction.
        if four.get("prior_bar_was_inside") and label not in ("1",):
            status, tone = f"{status} · 4H COILED", tone

        key = []
        if daily.get("prior_high") is not None:
            key.append(f"PDH {daily['prior_high']:.2f}")
        if daily.get("prior_low") is not None:
            key.append(f"PDL {daily['prior_low']:.2f}")
        if daily.get("sets_up"):
            key.append(f"{daily['sets_up']} @ {daily['f2_trigger']:.2f}")

        cards.append({
            "symbol": sym,
            "price": snap.get("price", c.get("price")),
            "change_pct": snap.get("change_pct"),
            "status": status,
            "tone": tone,
            "r1": daily.get("prior_high"),
            "s1": daily.get("prior_low"),
            "key_levels": " / ".join(key),
            "opens_as": daily.get("opens_as"),
            "sets_up": daily.get("sets_up"),
            "magnets_above": c.get("magnets_above", []),
            "magnets_below": c.get("magnets_below", []),
            "day_high": snap.get("day_high"),
            "day_low": snap.get("day_low"),
            "prev_close": snap.get("prev_close"),
        })
    return cards


def setup_cards(facts: dict, snaps: dict) -> list[dict]:
    """
    One card per tradeable setup -- armed levels when the board has any,
    otherwise the near misses, which is what makes a quiet board legible.

    Armed and rejected are kept visually distinct by `kind`, because conflating
    them is the one mistake that could cost money.
    """
    cards = []
    for l in facts.get("armed_levels", []):
        snap = snaps.get(l["symbol"], {})
        cards.append({
            "kind": "armed",
            "symbol": l["symbol"],
            "price": l.get("live_price") or snap.get("price") or l.get("price_at_scan"),
            "change_pct": snap.get("change_pct"),
            "badges": [l["tier"].replace("TIER", "TIER "), f"{l['setup_tf']} {l['pattern']}",
                       l["direction"].upper()],
            "tone": "bull" if l["direction"] == "bull" else "bear",
            "trigger": l.get("trigger"), "stop": l.get("stop"),
            "scale": l.get("scale_level"), "target": l.get("runner_target"),
            "score": l.get("score"), "runway_r": l.get("runway_r"),
            "distance_pct": l.get("live_distance_pct", l.get("distance_pct_at_scan")),
        })
    for n in facts.get("near_misses", []):
        snap = snaps.get(n["symbol"], {})
        gate = (n["failed_gates"] or ["?"])[0]
        why = "no runway" if gate == "gate2" else ("continuity veto" if gate == "gate3" else gate)
        cards.append({
            "kind": "rejected",
            "symbol": n["symbol"],
            "price": n.get("live_price") or snap.get("price"),
            "change_pct": snap.get("change_pct"),
            "badges": [f"{n['setup_tf']} {n['pattern']}", n["direction"].upper(), f"REJECTED · {why}"],
            "tone": "muted",
            "trigger": n.get("trigger"),
            "runway_r": n.get("runway_r"), "runway_required": n.get("runway_required"),
            "fraction_of_gate_met": n.get("fraction_of_gate_met"),
            "reasons": n.get("reasons"),
        })
    return cards


def gather(scan: dict, live: dict, now_et: str, include_near_misses: bool = False) -> dict:
    """
    Assemble the fact sheet. Pure data -- no model, no prose.

    `include_near_misses` is off for the live briefs on purpose. During a
    session the rejected patterns are noise that competes with the levels that
    actually qualified, and anything that makes a rejected level look tradeable
    is worse than not showing it. Study mode turns it on.
    """
    levels = [_trim_level(l, live) for l in scan.get("armed_levels", [])]
    levels.sort(key=lambda l: (-(l["score"] or 0), abs(l["distance_pct_at_scan"] or 99)))

    by_symbol = {s.get("symbol"): s for s in scan.get("symbols", [])}
    context = [_context(by_symbol[s], live) for s in CONTEXT_SYMBOLS if s in by_symbol]

    base = {
        "now_et": now_et,
        "scan_generated_et": scan.get("generated_at_et") or scan.get("generated_at_utc"),
        "scan_version": scan.get("version"),
        "watchlist_size": len(scan.get("tickers", [])),
        "gates": {
            "nominating_timeframes": scan.get("setup_timeframes"),
            "min_runway_r": scan.get("min_runway_r"),
            "min_ftfc": scan.get("min_ftfc"),
            "ftfc_timeframes": scan.get("ftfc_timeframes"),
        },
        "armed_levels": levels,
        "index_context": context,
        "live_prices_used": bool(live),
    }

    if include_near_misses:
        near = _near_misses(scan, live)
        base["near_misses"] = near
        base["near_miss_summary"] = _near_miss_summary(near)
    return base


# --------------------------------------------------------------------------
# the write-up
# --------------------------------------------------------------------------

SYSTEM = """You write the pre-session and mid-session brief for one trader's own \
Strat scanner. You are the desk analyst who reads the tape and says what it \
means; you are not a signal service and not an advisor.

THE ONE HARD RULE
Every number, symbol, level, and tier in your brief must come from the FACTS \
JSON you are given. Never invent a price, a level, a ticker, or a catalyst. You \
have no news feed and no market data beyond this JSON -- if something isn't in \
it, you do not know it, and saying so is a perfectly good sentence. A brief that \
quietly makes something up is worse than no brief at all.

WHAT THE FACTS MEAN
- The scanner nominates levels on the 4H and Daily only. Nothing below those \
  frames arms a level.
- tier ARMED = the level is loaded, price has not triggered it.
  tier TIER1   = price is through the level intrabar and the 15m has NOT closed \
  yet. A heads-up, not an entry.
  tier TIER2   = a 15m bar closed through the level. That is the entry.
- family "f2" is a Failed-2: trapped traders unwinding. It moves fast, so its \
  Tier 1 is the actionable tier -- unlike everything else, waiting for Tier 2 \
  can mean waiting through half the move.
- The plan on every level is a scale-out: half off at scale_level (+1R), stop to \
  breakeven, runner to runner_target.
- runway_r is how far the trade can run before higher-timeframe magnitude is \
  spent. ftfc_aligned is how many of the watched frames agreed with the trade at \
  scan time.
- score is the scanner's own composite conviction rank. It already ranks the \
  board -- respect it rather than re-ranking on your own instinct.
- Everything in armed_levels ALREADY cleared the scanner's gates. Do not \
  re-litigate whether a level qualifies; it does. Your job is what it means.
- near_misses (present only in the study brief) is the OPPOSITE: patterns the \
  scanner found and then REJECTED. Each carries the gate that killed it, and \
  the gates mean different things -- do not blur them:
    gate2  = runway. The nearest untouched higher-timeframe rung is closer than \
             min_runway_r, so there is no room to run before higher-timeframe \
             magnitude is spent. (Or the ladder is empty: all of it spent.)
    gate2a = the stop is so tight that risk is a negligible % of price.
    gate3  = hard continuity: the named timeframe's FORMING bar is trading \
             against the trade's direction. Not a count -- one frame vetoes.
    gate3b = FTFC: fewer than min_ftfc of the watched frames agree.
  The raw `reasons` strings are included; quote them when precision matters. \
  These are teaching material, never trade candidates. They \
  have no stop, target, scale point or score, because the scanner stops \
  computing those the moment a gate fails, so you cannot lay out a plan for one \
  and must not try. Never call a near miss armed, live, triggered, or \
  actionable, and never tell the trader to watch one for an entry. \
  fraction_of_gate_met is how close it came (0.95 = missed by 5%).
- In index_context, `frames` gives each timeframe's last CLOSED bar: its high, \
  its low, and its Strat label. `opens_as` says what the next bar of that frame \
  opens as given where price sits against those extremes, and `sets_up` is the \
  Failed-2 that becomes available.

FRESHNESS -- BE PRECISE ABOUT THIS
- `live_price` / `price_is_live` come from the last trade, seconds old.
- `price_at_scan`, `tier`, `ftfc_aligned` and every level's geometry come from \
  the last scan, which may be a few minutes old. `scan_generated_et` says when.
- Where a level has both, `live_distance_pct` is the current one; \
  `distance_pct_at_scan` is what the scanner saw. If they disagree materially, \
  say so plainly -- that gap is useful information, not an error.
- TIER IS NEVER LIVE. A level whose live price is through its trigger but whose \
  tier still reads ARMED has NOT confirmed; the next scan decides that. Never \
  describe such a level as triggered, entered, or live. Say price is through the \
  trigger and the scan hasn't confirmed it yet.

WHAT YOU MUST NOT CLAIM
- `last_closed_label` and `recent_labels` are Strat bar labels (1 inside, 2U up, \
  2D down, 3 outside) for that frame's last closed bars. They are NOT the \
  scanner's FTFC gate and must never be described as FTFC, as continuity, or as \
  a bull/bear "stack" count. FTFC is a separate computation this app does not \
  have for the index symbols -- only per-level `ftfc_aligned` is real. If you \
  want to describe index direction, describe the labels for what they are.

VOICE
Lead with the single thing that matters most, in one sentence -- what a trader \
would want if they said "just tell me". Then the detail. Write in plain prose \
and complete sentences; no arrow chains, no bullet soup, no hype. Name a level \
and say what it is. Short is good, but clear beats short.

WHAT YOU DO NOT DO
Do not tell the trader to buy or sell anything, size a position, or predict \
where price is going. Describe what the scanner nominated, where the levels sit, \
and what would confirm or invalidate each one. The decision is theirs."""

MORNING = """Write the MORNING brief -- the map going into the session.

Cover, in this order:
1. One opening sentence: the state of play.
2. Index context: where SPY/QQQ/IWM sit against their prior 4H and Daily \
   extremes, what that means the next bar of each frame opens as, and which \
   Failed-2 that sets up.
3. The levels worth watching at the bell -- highest score first, and only the \
   ones that earn the space. For each: where the trigger is, what confirms it \
   (a 15m close through), where the stop and the scale point sit.
4. Anything the last scan already had at TIER1/TIER2, flagged as such.

This is the map, not the signal. Most of this has not confirmed yet."""

AFTERNOON = """Write the AFTERNOON brief -- what is actually live right now.

Cover, in this order:
1. One opening sentence: what has happened and what is live.
2. Anything at TIER2 (a 15m closed through -- the entry) and TIER1 (through \
   intrabar, 15m still open). These lead. Flag any f2 family Tier 1 as \
   actionable on that tier.
3. What is still ARMED and close enough to trigger before the close -- use \
   live_distance_pct where you have it.
4. Time: note where minutes_to_next_15m or setup_bar_closes_at means a decision \
   is near.

Skip the pre-open framing -- the session is underway."""


STUDY = """Write the STUDY brief -- for reading the market with the session \
closed, to understand the scanner rather than to trade.

The board is likely empty or thin; that is the subject, not a problem. The \
interesting question is WHY, and near_misses answers it: these are the patterns \
the scanner found and rejected, each with the gate that killed it.

Cover, in this order:
1. One opening sentence: what the scanner saw and what it did with it -- how \
   many patterns it found versus how many survived the gates.
2. The closest calls. Lead with the highest fraction_of_gate_met: a 2-1-2 that \
   missed the runway gate by a tenth of an R is the most instructive thing on \
   the page. Name the pattern, the timeframe, the trigger, and exactly what it \
   lacked.
3. The pattern in the rejections. Are they nearly all gate2 (no room to run \
   before higher-timeframe magnitude is spent) or gate3 (a higher timeframe's \
   forming bar vetoes the direction)? Say which, and what that says about the \
   tape right now -- a board full of runway rejections is a compressed, \
   rangebound market; one full of continuity rejections is a market at odds \
   with itself. Names appearing in BOTH directions are the signature of a coil.

   USE near_miss_summary FOR EVERY COUNT. It has the totals per gate, per \
   direction, and the list of symbols rejected both ways, already tallied. Do \
   not count entries yourself and do not estimate -- quote those numbers.
4. Index structure worth carrying into the next session.

These did NOT qualify. Describe them as rejected setups being studied, never as \
levels to watch or trade. Do not give entries, stops or targets for them -- the \
scanner never computed those."""


def _user_prompt(facts: dict, session: str) -> str:
    instructions = {"morning": MORNING, "afternoon": AFTERNOON}.get(session, STUDY)
    return (
        f"{instructions}\n\n"
        f"FACTS (this is everything you know):\n"
        f"```json\n{json.dumps(facts, indent=2, default=str)}\n```"
    )


MACRO_SYSTEM = """You are a markets desk analyst pulling the macro backdrop for \
one trader's pre-session brief.

You have web search. USE IT -- every factual claim here must come from a search \
result you actually retrieved in this turn, never from memory. Your training \
data is stale by definition and a stale headline presented as today's news is \
the worst thing you could put on a trading page.

Return 3-5 drivers, each as:
  TITLE: a short headline, under 60 characters
  BODY: two sentences of what happened and why it matters to equities today
  IMPACT: high | medium | low

Then a line beginning "CALENDAR:" listing today's scheduled US economic \
releases with times in ET, or "CALENDAR: none found" if search doesn't surface \
any. Do not reconstruct a calendar from memory.

Rules. If search returns nothing usable for a topic, say so and drop it rather \
than filling the space. Prefer the last 24-48 hours. Give numbers only when the \
source states them. Do not give trading advice, price targets, or predictions.

OUTPUT ONLY THE DRIVERS AND THE CALENDAR LINE. This text is rendered straight \
onto a page, so no preamble, no narration of your searching, no "let me look \
that up", no notes about which queries worked, no closing commentary. Start at \
the first TITLE:. If the market is closed, one short italic line saying so and \
which session the drivers describe is fine before the first TITLE."""


def write_macro(now_et: str, api_key: str) -> tuple[str, list[str]]:
    """
    The macro backdrop, from real web search. Returns (text, source_urls).

    This is the one part of the brief that isn't derived from the scan, and so
    the one part that could be invented. Hence actual search rather than recall:
    the model is required to retrieve before it asserts, and the sources come
    back with the text so a claim can be checked.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    resp = client.messages.create(
        model=MODEL,
        max_tokens=4000,
        system=MACRO_SYSTEM,
        # Each search is a real round trip, and the model will happily spend
        # every use it's given -- at 10 this call ran past five minutes, which
        # is not a button anyone presses twice. 5 is enough for a few parallel
        # queries and keeps the call inside a minute or so.
        tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 5}],
        # Macro is summarising retrieved text, not reasoning hard about it.
        output_config={"effort": "low"},
        messages=[{
            "role": "user",
            "content": (
                f"It is {now_et}. Search for what is moving US equities right now: "
                f"the main market-driving stories, and today's US economic calendar. "
                f"Then write the drivers in the format given."
            ),
        }],
    )

    parts, sources = [], []
    for block in resp.content:
        if block.type == "text":
            parts.append(block.text)
        elif block.type == "web_search_tool_result":
            content = getattr(block, "content", None)
            # On failure `content` is a single error object, not a list.
            if isinstance(content, list):
                for r in content:
                    url = getattr(r, "url", None)
                    if url and url not in sources:
                        sources.append(url)
    return "".join(parts).strip(), sources


READS_SCHEMA = {
    "type": "object",
    "properties": {
        "market_condition": {
            "type": "string",
            "description": "2-4 sentences on the state of the tape overall.",
        },
        "condition_label": {
            "type": "string",
            "description": "2-4 word label, e.g. 'Compressed · Rangebound'.",
        },
        "reads": {
            "type": "array",
            "description": "One entry per symbol given, same symbols, no others.",
            "items": {
                "type": "object",
                "properties": {
                    "symbol": {"type": "string"},
                    "read": {
                        "type": "string",
                        "description": "2-3 sentences on this symbol's structure "
                                       "and what would change it.",
                    },
                },
                "required": ["symbol", "read"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["market_condition", "condition_label", "reads"],
    "additionalProperties": False,
}


def write_reads(facts: dict, cards: list[dict], setups: list[dict], api_key: str) -> dict:
    """
    Per-symbol narrative, as structured JSON keyed by symbol.

    The model writes ONLY prose here. Every number the page displays was already
    computed in index_cards/setup_cards; this fills the paragraph next to them.
    Structured output means the app can place each read against the right card
    instead of parsing a wall of text and hoping the order held.
    """
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    payload = {
        "now_et": facts.get("now_et"),
        "gates": facts.get("gates"),
        "index_cards": cards,
        "setups": setups[:24],
        "near_miss_summary": facts.get("near_miss_summary"),
    }
    resp = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": READS_SCHEMA}},
        system=SYSTEM + (
            "\n\nYOU ARE WRITING CARD TEXT, NOT A BRIEF. Return one read per "
            "symbol in index_cards, using exactly those symbols. Each read is "
            "2-3 sentences on what that symbol's structure means and what would "
            "change it. The card already displays price, percent change, the "
            "status badge and the levels -- do not restate them mechanically; "
            "add what the numbers don't say. Never state a number that isn't in "
            "the payload."
        ),
        messages=[{"role": "user", "content":
                   f"```json\n{json.dumps(payload, indent=1, default=str)}\n```"}],
    )
    text = next((b.text for b in resp.content if b.type == "text"), "{}")
    return json.loads(text)


def build(facts: dict, cards: list[dict], setups: list[dict], api_key: str) -> dict:
    """
    Run the macro search and the reads at the same time.

    They share no inputs -- macro reads the web, reads reads the scan -- so
    running them in sequence just added one call's latency to the other's. The
    macro call is the slow one (each web search is a real round trip), so
    overlapping them makes the button roughly as slow as the search alone
    instead of search plus reads.

    A failure in either is contained: the page drops that section and renders
    the rest, because a brief missing its macro panel is still worth reading.
    """
    from concurrent.futures import ThreadPoolExecutor

    out = {"macro": "", "sources": [], "reads": {}}
    with ThreadPoolExecutor(max_workers=2) as pool:
        f_macro = pool.submit(write_macro, facts.get("now_et", ""), api_key)
        f_reads = pool.submit(write_reads, facts, cards, setups, api_key)
        try:
            out["macro"], out["sources"] = f_macro.result()
        except Exception as e:
            logger.warning("macro search failed: %s", e)
            out["macro_error"] = str(e)
        try:
            out["reads"] = f_reads.result()
        except Exception as e:
            logger.warning("reads failed: %s", e)
            out["reads_error"] = str(e)
    return out


def write(facts: dict, session: str, api_key: str) -> Iterator[str]:
    """Stream the brief. Yields text chunks, so the page renders as it lands
    rather than staring at a spinner for the length of an Opus turn."""
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    with client.messages.stream(
        model=MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={"effort": "medium"},
        system=SYSTEM,
        messages=[{"role": "user", "content": _user_prompt(facts, session)}],
    ) as stream:
        yield from stream.text_stream
