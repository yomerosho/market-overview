"""
quotes.py
---------
Live prices, and nothing else.

WHY THIS FILE IS SO SMALL
=========================
It would be easy to assume a brief needs its own market-data layer -- fetch
bars, filter to regular hours, resample to 4H/1D/1W, label them. It doesn't,
and building one here would be a mistake.

Everything structural the brief needs is already fixed and already published in
the scanner's latest_scan.json: the armed levels, and each symbol's last CLOSED
4H / Daily / Weekly bar (high, low, Strat label). A closed bar's extremes do not
change -- that's what "closed" means. They only move when the next bar closes,
which is hours or days apart, and the scan will have picked that up.

The one thing that goes stale between scans is the last trade price. So that is
the only thing we fetch: one Alpaca request for all the symbols we care about.

That keeps the subtle, correctness-critical logic -- RTH filtering, session
alignment, resampling -- in exactly one place (the scanner), where it is
tested. A second copy here would drift, and a brief quoting drifted levels is
worse than no brief.
"""

from __future__ import annotations

import logging
from typing import Iterable, Optional

import requests

logger = logging.getLogger("market_brief.quotes")

# Yahoo's chart endpoint. Unofficial and unsupported, but free, keyless, and the
# only reachable source for the VIX itself: Alpaca serves equities, and the VIX
# is an index, so it has no trade tape to quote (VIXY and UVXY are ETFs that
# TRACK volatility -- they are not the VIX and must never be labelled as it).
_VIX_URL = "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d"


def vix() -> Optional[dict]:
    """
    {"level": float, "prev_close": float, "change_pct": float} or None.

    None on any failure, and the caller simply omits the volatility card. An
    unofficial endpoint WILL break eventually; when it does the brief should
    lose one panel, not fall over.
    """
    try:
        r = requests.get(_VIX_URL, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        m = r.json()["chart"]["result"][0]["meta"]
        level = float(m["regularMarketPrice"])
        prev = m.get("chartPreviousClose") or m.get("previousClose")
        prev = float(prev) if prev else None
    except Exception:
        logger.warning("VIX lookup failed; omitting the volatility panel.", exc_info=True)
        return None

    return {
        "level": round(level, 2),
        "prev_close": round(prev, 2) if prev else None,
        "change_pct": round((level - prev) / prev * 100, 2) if prev else None,
    }


def snapshots(
    symbols: Iterable[str],
    api_key: str,
    secret_key: str,
    data_feed: str = "iex",
) -> dict[str, dict]:
    """
    Per-symbol daily context: last price, session OHLC, prior close, and the
    day's percent change.

    latest_prices() answers "what is it trading at". This answers "what has it
    done today", which is what a card headline needs -- the -0.99% next to the
    price. Alpaca returns both the current and previous daily bar in one call,
    so the change is computed from real closes rather than inferred.
    """
    symbols = [s.upper() for s in symbols]
    if not symbols or not (api_key and secret_key):
        return {}
    try:
        from alpaca.data.enums import DataFeed
        from alpaca.data.historical import StockHistoricalDataClient
        from alpaca.data.requests import StockSnapshotRequest
    except ImportError:
        logger.warning("alpaca-py isn't installed; no daily context.")
        return {}

    feed = {"iex": DataFeed.IEX, "sip": DataFeed.SIP}.get(data_feed.lower(), DataFeed.IEX)
    try:
        client = StockHistoricalDataClient(api_key, secret_key)
        res = client.get_stock_snapshot(
            StockSnapshotRequest(symbol_or_symbols=symbols, feed=feed)
        )
    except Exception:
        logger.exception("Snapshot request failed; no daily context.")
        return {}

    out: dict[str, dict] = {}
    for sym, snap in (res or {}).items():
        try:
            day, prev = snap.daily_bar, snap.previous_daily_bar
            last = snap.latest_trade.price if snap.latest_trade else day.close
            chg = ((last - prev.close) / prev.close * 100) if prev and prev.close else None
            out[sym] = {
                "price": round(float(last), 2),
                "change_pct": round(float(chg), 2) if chg is not None else None,
                "day_open": round(float(day.open), 2),
                "day_high": round(float(day.high), 2),
                "day_low": round(float(day.low), 2),
                "prev_close": round(float(prev.close), 2) if prev else None,
            }
        except Exception:
            continue
    return out


def latest_prices(
    symbols: Iterable[str],
    api_key: str,
    secret_key: str,
    data_feed: str = "iex",
) -> dict[str, dict]:
    """
    {symbol: {"price": float, "at": iso8601 str}} for whatever came back.

    Never raises: a dead quote feed should cost the brief its freshness, not its
    existence. On failure you get {} and the caller falls back to the scan's own
    prices, which are at most one scan cycle old.
    """
    symbols = [s.upper() for s in symbols]
    if not symbols or not (api_key and secret_key):
        return {}

    try:
        from alpaca.data.enums import DataFeed
        from alpaca.data.historical import StockHistoricalDataClient
        from alpaca.data.requests import StockLatestTradeRequest
    except ImportError:
        logger.warning("alpaca-py isn't installed; briefing off scan prices only.")
        return {}

    feed_map = {"iex": DataFeed.IEX, "sip": DataFeed.SIP}
    feed = feed_map.get(data_feed.lower(), DataFeed.IEX)
    if data_feed.lower() not in feed_map:
        logger.warning("Unknown ALPACA_DATA_FEED %r; defaulting to IEX.", data_feed)

    try:
        client = StockHistoricalDataClient(api_key, secret_key)
        res = client.get_stock_latest_trade(
            StockLatestTradeRequest(symbol_or_symbols=symbols, feed=feed)
        )
    except Exception:
        logger.exception("Latest-trade request failed; briefing off scan prices only.")
        return {}

    out: dict[str, dict] = {}
    for sym, trade in (res or {}).items():
        try:
            out[sym] = {
                "price": round(float(trade.price), 2),
                "at": trade.timestamp.isoformat(),
            }
        except Exception:
            continue
    return out
