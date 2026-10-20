# Kalshi sum-under-$1 scan: 2026-07-22 to 2026-10-20

**UPPER BOUND.** Prices are the top-of-book YES ask at the close of each 1-minute
candle. Kalshi publishes no historical order-book depth, so none of this says how
many contracts were actually available at those asks. Thin-leg traded volume is
the only size proxy.

Series: KXNFLGAME, KXNBAGAME. Historical cutoff: 2026-08-21T00:00:00Z
(markets settled before it come from `/historical/*`, the rest from the live endpoints).
Last-quote carry-forward cap: 5 min.

## Totals

| category | events scanned | skipped | bars scanned | bars gross<=0.93 | events gross<=0.93 | bars net>0 | events net>0 | net>0 runs | median run (min) | max run (min) |
|---|---|---|---|---|---|---|---|---|---|---|
| NBA | 67 | 0 | 119506 | 0 | 0 | 0 | 0 | 0 | - | - |
| NFL | 142 | 0 | 2040468 | 0 | 0 | 8 | 2 | 3 | 1 | 6 |

Of the net>0 bars, 5 relied on at least one leg's ask carried forward from an earlier minute.

## Largest net>0 runs

| event | start (UTC) | minutes | min gross | max net edge | thin-leg volume |
|---|---|---|---|---|---|
| KXNFLGAME-26SEP13DALNYG | 2026-05-28T09:55Z | 1 | 0.9500 | 0.0100 | 0.00 |
| KXNFLGAME-26SEP27CINPIT | 2026-09-15T18:06Z | 1 | 0.9500 | 0.0100 | 0.00 |
| KXNFLGAME-26SEP27CINPIT | 2026-09-15T18:08Z | 6 | 0.9500 | 0.0100 | 0.00 |

## Skipped events


## Method

- Event = one game; legs = the two team-wins YES markets. Kept only if both are binary,
  finalized, name different teams, and their settlement values sum to exactly $1.00
  (a tie pays $0.50 + $0.50, still exhaustive). Anything else is skipped and listed.
- Every bar: gross_sum = sum of legs' YES ask (candle close); taker fee per leg =
  ceil-to-cent(0.07 * P * (1-P)) for one contract; net_edge = 1 - gross_sum - fees.
  `net_edge_if_maker_fees` uses 0.0175 for reference only: lifting asks is taking.
- A run = consecutive minutes meeting the condition. Thin-leg volume during a run is
  the smaller of the legs' summed traded volume across the run.

## Fees as reported by the API

- KXNFLGAME: `quadratic_with_maker_fees`, multiplier 1, changes [('2026-01-01T08:00:00Z', 'quadratic_with_maker_fees', 1)]
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
