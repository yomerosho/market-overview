# Kalshi sum-under-$1 scan: 2026-04-15 to 2026-06-30

**UPPER BOUND.** Prices are the top-of-book YES ask at the close of each 1-minute
candle. Kalshi publishes no historical order-book depth, so none of this says how
many contracts were actually available at those asks. Thin-leg traded volume is
the only size proxy.

Series: KXNBAGAME. Historical cutoff: 2026-08-21T00:00:00Z
(markets settled before it come from `/historical/*`, the rest from the live endpoints).
Last-quote carry-forward cap: 5 min.

## Totals

| category | events scanned | skipped | bars scanned | bars gross<=0.93 | events gross<=0.93 | bars net>0 | events net>0 | net>0 runs | median run (min) | max run (min) |
|---|---|---|---|---|---|---|---|---|---|---|
| NBA | 87 | 0 | 43414 | 1 | 1 | 2 | 2 | 2 | 1.0 | 1 |

Of the net>0 bars, 0 relied on at least one leg's ask carried forward from an earlier minute.

## Largest net>0 runs

| event | start (UTC) | minutes | min gross | max net edge | thin-leg volume |
|---|---|---|---|---|---|
| KXNBAGAME-26APR15GSWLAC | 2026-04-16T04:40Z | 1 | 0.9300 | 0.0300 | 130344.00 |
| KXNBAGAME-26APR30DENMIN | 2026-05-01T04:08Z | 1 | 0.9500 | 0.0100 | 132827.14 |

## Skipped events


## Method

- Event = one game; legs = the two team-wins YES markets. Kept only if both are binary,
  finalized, name different teams, and their settlement values sum to exactly $1.00
  (a tie pays $0.50 + $0.50, still exhaustive). Anything else is skipped and listed.
- Every bar: gross_sum = sum of legs' YES ask (candle close); taker fee per leg =
  ceil-to-cent(0.07 * P * (1-P)) for one contract; net_edge = 1 - gross_sum - fees.
  `net_edge_if_maker_fees` uses 0.0175 for reference only: lifting asks is taking.
- Events not already cached at full resolution were screened with hourly candles: 1-minute
  bars were fetched only for hours whose legs' yes_ask lows sum below 1 - 0.01 x legs, the
  most any net>0 minute could cost. Counts above are exact either way, but for screened
  events `bars`, `min_gross_sum` and `median_gross_sum` in events_scanned.csv cover only
  the flagged hours (see its `resolution` column).
- A run = consecutive minutes meeting the condition. Thin-leg volume during a run is
  the smaller of the legs' summed traded volume across the run.

## Fees as reported by the API

- KXNBAGAME: `quadratic_with_maker_fees`, multiplier 1, changes []

## Not verified

- The 0.07 taker / 0.0175 maker coefficients and the rounding rule: kalshi.com/fee-schedule
  could not be read from the scan environment. Only the fee *type* came from the API.
  Kalshi also rounds fees per order, not per contract; at size the per-contract fee is lower
  than ceil-to-cent of one contract, so net_edge here is conservative on fees.
- Candle close is the ask at the end of the minute; legs are simultaneous only to that
  resolution. A minute with no candle is filled with the last ask (see carry-forward count).
- Every game's rules allow resolution 'to a fair market price' if the game is not played
  within 48h. That is real ex-ante risk to the 'riskless' arb even though no scanned event
  settled that way.
- No depth: an ask is assumed fillable for at least one contract.
