# Chart Academy

A Duolingo-style course that teaches a complete beginner to read charts,
candles and market structure, and later to place swing option trades and
trade 0DTEs. Mobile-first, installable as a PWA, works on desktop too.

This is the **stage 1–5 prototype**: the lesson path, hearts, XP, streaks,
concept mastery, and the drill types, all running on synthetic charts with
known answers. Progress is kept in the browser for now (see *Roadmap*).

## Run it

```sh
cd academy
npm install
npm run dev        # http://localhost:3000
```

Open it on a phone on the same network, or use your browser's device
toolbar. "Add to Home Screen" installs it as an app.

## How it's put together

| Path | What it is |
|---|---|
| `src/content/stages.ts` | **The curriculum.** Stages → units → lessons → exercises, as plain data. Add a lesson by adding an object; no code changes. |
| `src/lib/types.ts` | The content model: the five exercise types the player knows how to render and grade. |
| `src/lib/chart-gen.ts` | Deterministic synthetic OHLC generator. Given a seed and a structure (`bull` / `bear` / `range`) it builds a chart *and* its answer key (swing highs/lows). Same seed, same chart, every time, on every device. |
| `src/lib/options.ts` | Black-Scholes pricing (zero rates) for the options lab. |
| `src/lib/progress.ts` | Per-user progress: XP, hearts (refill one per 30 min), streak, lesson results, per-concept mastery. localStorage today; the same shape becomes a DB row per user. |
| `src/components/LessonPlayer.tsx` | Runs a lesson: progress bar, hearts, pass/fail (70%, checkpoints 85%), end screens. |
| `src/components/exercises/` | One component per exercise type. |
| `src/components/Candles.tsx` | Chart rendering (TradingView Lightweight Charts) with tap-to-mark, swing markers and horizontal levels. |
| `src/components/Path.tsx` | The stage map. Lessons unlock in order; stages 5–7 are placeholders marked Premium. |

### Exercise types

- **teach** — a short card, optionally with an annotated chart. Not graded.
- **choice** — multiple choice, optionally over a chart with labelled levels.
- **classify** — bull / bear / no trend, on a generated chart.
- **tap-swings** — tap every swing high (or low). Graded with a ±2-bar tolerance; misses and extras are shown on the chart.
- **tap-candle** — tap the body / upper wick / lower wick of a big SVG candle.
- **replay** — the chart stops at the right edge; choose long / short / skip, then the hidden bars play forward and the trade's % move is shown. Graded on the decision (with the structure), not the outcome.
- **options-lab** — a Black-Scholes pricer with strike and days-to-expiry sliders, live premium / delta / theta and a P&L-at-expiry curve. Each lab sets a goal to hit (an OTM call, 0.40–0.60 delta, ≤7 DTE, ≤$1 premium).

### Design rules

- **Reward process, not P&L.** Correctly skipping a bad setup is worth as much XP as taking a good one. A wrong answer costs a heart, the way a bad trade costs capital.
- **Synthetic charts.** Students can't look up "what happened next", and every drill has an exact answer key.
- **Content is data.** Lessons live in one file so the curriculum can be rewritten without touching the player.

## Roadmap

1. **MVP** — Supabase auth + Postgres for progress, review queue driven by the mastery scores (weak concepts come back), replay drill with target and stop placement.
2. **Options + paywall** — swing (stage 6) and 0DTE (stage 7) units from the author's own method, Stripe subscriptions gating stages 5–7.
3. **Protection** — per-user watermark on charts and lesson text, device/session limits, rate limiting, ToS.
4. **Growth** — discipline leaderboard, trade journal, lesson-authoring admin page, App Store wrapper (Capacitor).

## Attribution

Charts are drawn with [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache-2.0). Its licence requires the attribution logo shown in the chart corner.
