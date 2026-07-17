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
from typing import Iterator, Optional

import requests

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


def gather(scan: dict, live: dict, now_et: str) -> dict:
    """Assemble the fact sheet. Pure data -- no model, no prose."""
    levels = [_trim_level(l, live) for l in scan.get("armed_levels", [])]
    levels.sort(key=lambda l: (-(l["score"] or 0), abs(l["distance_pct_at_scan"] or 99)))

    by_symbol = {s.get("symbol"): s for s in scan.get("symbols", [])}
    context = [_context(by_symbol[s], live) for s in CONTEXT_SYMBOLS if s in by_symbol]

    return {
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


def _user_prompt(facts: dict, session: str) -> str:
    instructions = MORNING if session == "morning" else AFTERNOON
    return (
        f"{instructions}\n\n"
        f"FACTS (this is everything you know):\n"
        f"```json\n{json.dumps(facts, indent=2, default=str)}\n```"
    )


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
