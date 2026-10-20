# Kalshi sum-under-$1 scan

Read-only. Measures how often you could have bought YES on every outcome of a
settled game for less than $1.00 after fees. No login, no keys, no orders.

```
python kalshi_arb/scan.py                  # NFL + NBA game winners, last 90 days
python kalshi_arb/scan.py --since 2026-04-15 --until 2026-06-30 --series KXNBAGAME --tag nba-playoffs-2026
```

Outputs land in `kalshi_arb/out/<tag>/`:

| file | what |
|---|---|
| `SUMMARY.md` | totals, largest runs, skip reasons, what was not verified |
| `weekly_summary.csv` | per ISO week and category: event-bars with gross_sum <= 0.93, distinct events, net_edge > 0 bars/events, median/max run length, thin-leg volume |
| `opportunity_bars.csv` | every minute with gross_sum <= 0.93 or net_edge > 0 |
| `opportunity_runs.csv` | consecutive-minute runs of either condition |
| `events_scanned.csv` | every event kept, with its min/median gross_sum and best net edge |
| `events_skipped.csv` | every event dropped, and why |

**Every number is an upper bound.** Candles carry top-of-book bid/ask OHLC but
no depth, so an ask is assumed fillable for at least one contract.

## How it works

- Settled markets come from both sides of `GET /historical/cutoff`:
  `/historical/markets` before it, `/markets?status=settled` after. Candles
  likewise come from `/historical/markets/{t}/candlesticks` or
  `/series/{s}/markets/{t}/candlesticks`; their field names differ
  (`close` vs `close_dollars`) and are normalized.
- An event is kept only if it has exactly two binary, finalized legs naming
  different teams whose settlement values sum to $1.00. A tie ($0.50 + $0.50)
  passes; a "fair market price" resolution doesn't.
- 1-minute candles, fetched in chunks of 5,000 (the API max). Minutes with no
  candle carry the last ask for up to `--max-fill` minutes (default 5).
- gross_sum = sum of YES ask closes; taker fee per leg = ceil-to-cent(0.07 *
  P * (1-P)); net_edge = 1 - gross_sum - fees.
- Responses are cached in `kalshi_arb/.cache/kalshi.sqlite` (gitignored).
  Candles are cached forever; settled-market listings for 6 hours
  (`--refresh-lists` to force).
