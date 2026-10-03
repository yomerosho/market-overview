# Chart Academy

A Duolingo-style course that teaches a complete beginner to read charts,
candles and market structure, and later to place swing option trades and
trade 0DTEs. Mobile-first, installable as a PWA, works on desktop too.

A **four-week, day-by-day programme** (about 1.5 hours a week, ~15 minutes a day): week 1 reading
the market, week 2 trade planning and options mechanics, week 3 the 0DTE
method, week 4 the swing-options setup library. Every day mixes a taught
lesson with generated practice, and most days end with a review that leans
on whatever the student has been getting wrong. Progress is kept in the
browser for now (see *Roadmap*).

## Run it

```sh
cd academy
npm install
npm run dev        # http://localhost:3000
```

Open it on a phone on the same network, or use your browser's device
toolbar. "Add to Home Screen" installs it as an app.

## Accounts and saved progress (optional)

Without any setup the app works fully, keeping progress in the browser.
To let students sign in (6-digit email code, no passwords) and have their
progress follow them between phone and laptop:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
   It creates one `profiles` row per user (progress JSON + a `plan` column
   the paywall will use), with row-level security so a student can only
   read and write their own row and can never change their own plan.
3. In Authentication → Providers, make sure **Email** is on. Under
   Authentication → Email Templates, the *Magic Link* template must include
   `{{ .Token }}` so the email carries the 6-digit code.
4. Copy `.env.example` to `.env.local` and fill in the project URL and anon
   key from Settings → API. Restart `npm run dev`.

How sync works: localStorage is always the working copy. On sign-in the
remote copy is pulled and **merged** with local (lessons and mastery
combined, XP and streak take the larger), then every change is mirrored
back with a short debounce. Sign-out stops mirroring; local progress stays.

## How it's put together

| Path | What it is |
|---|---|
| `src/content/stages.ts` | **The curriculum.** Weeks → days → lessons → exercises, as plain data. Add a lesson by adding an object; no code changes. |
| `src/content/drills.ts` | **Drill factories.** Question pools per concept (several phrasings each), seeded chart drills, and the `practiceSet` / `reviewSet` builders that assemble generated lessons. Reviews weight toward weak concepts. |
| `src/lib/types.ts` | The content model: the exercise types the player knows how to render and grade. |
| `src/lib/swing.ts` | Synthetic daily charts scripted from the swing setup library: breakout + retest, 20 EMA pullback, bull flag, 50 SMA reclaim, the failed breakout, and the range to leave alone. |
| `src/lib/intraday.ts` | Synthetic 5-minute session charts for the 0DTE drills: premarket, PMH/PML, PDH/PDL, a 15-minute ORB and a scripted outcome (open drive, continuation, failed break, chop) with volume. |
| `src/lib/charts.ts` | `resolveChart(spec)`: one entry point that returns candles, levels, MA overlays and the expected replay answer for either generator. |
| `src/lib/chart-gen.ts` | Deterministic synthetic OHLC generator. Given a seed and a structure (`bull` / `bear` / `range`) it builds a chart *and* its answer key (swing highs/lows). Same seed, same chart, every time, on every device. |
| `src/lib/options.ts` | Black-Scholes pricing (zero rates) for the options lab. |
| `src/lib/progress.ts` | Per-user progress: XP, hearts (refill one per 30 min), streak, lesson results, per-concept mastery. localStorage as the working copy, mirrored to the user's `profiles` row when signed in. |
| `src/lib/supabase/` | Browser client (null when unconfigured) and the auth hook: session state, email-code sign-in, and wiring sign-in/out to the progress mirror. |
| `supabase/schema.sql` | The one table, its RLS policies, and the trigger that keeps `plan` read-only for users. |
| `src/components/LessonPlayer.tsx` | Runs a lesson: progress bar, hearts, pass/fail (70%, checkpoints 85%), end screens. |
| `src/components/exercises/` | One component per exercise type. |
| `src/components/Candles.tsx` | Chart rendering (TradingView Lightweight Charts) with tap-to-mark, swing markers, dashed/solid levels, translucent boxes (the ORB), line overlays (MAs, VWAP) and a volume histogram. |
| `src/components/Path.tsx` | The path: weeks and days, lessons unlock in order. ⟳ marks a generated lesson that is different every attempt. |

### Exercise types

- **teach** — a short card, optionally with an annotated chart. Not graded.
- **choice** — multiple choice, optionally over a chart with labelled levels.
- **classify** — bull / bear / no trend, on a generated chart.
- **tap-swings** — tap every swing high (or low). Graded with a ±2-bar tolerance; misses and extras are shown on the chart.
- **tap-candle** — tap the body / upper wick / lower wick of a big SVG candle.
- **replay** — the chart stops at the right edge; choose long / short / skip, then the hidden bars play forward and the trade's % move is shown. Graded on the decision, not the outcome. On intraday charts the stop point is the first 5-minute close after the ORB box (or the first candle for an open drive, or the engulfing candle for a reversal); on swing charts it's the confirmation candle. The answer follows the scenario.
- **ftfc** — the five-timeframe continuity panel (1W/1D/4H/1H/15m) from the author's chart; read the bias or count the agreement.
- **options-lab** — a Black-Scholes pricer with strike and days-to-expiry sliders, live premium / delta / theta and a P&L-at-expiry curve. Each lab sets a goal to hit (an OTM call, 0.40–0.60 delta, ≤7 DTE, ≤$1 premium).

### Design rules

- **Reward process, not P&L.** Correctly skipping a bad setup is worth as much XP as taking a good one. A wrong answer costs a heart, the way a bad trade costs capital.
- **Synthetic charts.** Students can't look up "what happened next", and every drill has an exact answer key.
- **Content is data.** Lessons live in one file so the curriculum can be rewritten without touching the player.

## Roadmap

1. **Paywall** — Stripe subscriptions gating weeks 2–4, writing `profiles.plan` from the webhook.
2. **Protection** — per-user watermark on charts and lesson text, device/session limits, rate limiting, ToS.
3. **Growth** — discipline leaderboard, trade journal, lesson-authoring admin page, replay drill with target and stop placement, App Store wrapper (Capacitor).

## Attribution

Charts are drawn with [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache-2.0). Its licence requires the attribution logo shown in the chart corner.
