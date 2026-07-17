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
from typing import Iterable

logger = logging.getLogger("market_brief.quotes")


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
