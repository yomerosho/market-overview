# Market Brief

The write-up. (The repo is `market-overview`; the page itself is the Market
Brief.)

The [strat-alerts](https://github.com/yomerosho/strat-alerts) board tells you
**what** is armed. This tells you what it **means**: pick a session, hit
generate, and Claude writes the brief from the scanner's own facts.

Two sessions, because the same board means different things at 08:30 and 14:00:

- **Morning** — the map. What the 09:30 4H and Daily bars open as, which
  Failed-2 that sets up, which levels are loaded, what would confirm them.
- **Afternoon** — what is actually live. Tier 2 first (the entry), Tier 1 next
  (through intrabar, 15m still open), then what is still armed with enough
  session left to trigger.

## The one design rule

`gather()` in [brief.py](brief.py) is deterministic. It reads the scan, overlays
live prices, and is the **only** thing that decides what is true. `write()` hands
that JSON to Claude and asks for prose.

Claude never fetches, never derives a level, and never sees a symbol it wasn't
handed. So if the brief is ever wrong, the bug is in `gather()` or in the
scanner — not in the prompt. The exact JSON the model received is in an expander
at the bottom of every page, so you can always check it against the board.

## How it relates to the scanner

One direction, one seam. This app **consumes `latest_scan.json`**, a file the
scanner already publishes to GitHub on every run. It imports no scanner code,
shares no modules, and needs no copy of `bars.py`. The scanner doesn't know this
app exists and can be refactored freely, as long as that JSON keeps its shape.

That is deliberate. Everything structural the brief needs is already in the
scan and already fixed: the armed levels, and each symbol's last **closed** 4H /
Daily / Weekly bar. A closed bar's extremes don't change — that's what closed
means.

The only thing that goes stale between scans is the last trade price, so that is
the only thing fetched directly ([quotes.py](quotes.py) — one Alpaca
`latest_trade` call, no bars, no resampling). This keeps the subtle,
correctness-critical logic — RTH filtering, session alignment, resampling — in
exactly one place, where it's tested. A second copy here would drift, and a brief
quoting drifted levels is worse than no brief.

### What is live and what is not

| | Source | Age |
|---|---|---|
| `live_price`, `live_distance_pct` | Alpaca last trade | seconds |
| Levels, stops, targets, `score`, `runway_r`, `ftfc_aligned` | the scan | up to one scan cycle |
| **Tier** (ARMED / TIER1 / TIER2) | the scan | up to one scan cycle |

**Tier is never live**, and the prompt is explicit about it. Promoting
ARMED → TIER1 → TIER2 requires knowing whether a 15-minute bar *closed* through
the level, which needs bar data this app doesn't have. A level whose live price
is through its trigger but whose tier still reads ARMED has **not** confirmed —
the next scan decides that. Inferring it from a last trade would invent entries
that never happened.

One honest gap: the scan publishes each frame's last closed bar (high, low, Strat
label) but not its open/close, and the scanner's FTFC gate compares the *forming*
bar against the closed one. So index-level FTFC can't be reproduced here and
isn't claimed — the brief describes the raw Strat labels for what they are.
Per-level `ftfc_aligned` is real; the scanner computed it.

## Running it

```sh
pip install -r requirements.txt
cp env.example .env     # add your ANTHROPIC_API_KEY
streamlit run app.py
```

Only `ANTHROPIC_API_KEY` is required. Without Alpaca keys the brief still runs
off the scan's own prices and says so; without a Claude key the facts still load
and only the write-up is disabled.

### Deploying to Streamlit Cloud

1. https://share.streamlit.io → **New app** → pick `yomerosho/market-overview`,
   branch `main`, main file `app.py`.
2. **Advanced settings → Secrets**, paste the contents of
   [.streamlit/secrets.toml.example](.streamlit/secrets.toml.example) with your
   real values. Same names as `.env`; `_secret()` reads `st.secrets` first, then
   the environment.
3. Deploy. Nothing needs to run on a schedule — the scanner's GitHub Action
   already refreshes `latest_scan.json`, and this app reads it on each load.

**Set `APP_PASSWORD` before you deploy.** A Streamlit Cloud app is reachable by
anyone with the URL, and every Generate here is an Opus call billed to the key in
your Secrets — unprotected, it's a stranger's free credit line. Setting
`APP_PASSWORD` turns on the gate; leaving it unset keeps the app open (fine on
localhost) and the page will nag you about it.

Theme is pinned in [.streamlit/config.toml](.streamlit/config.toml). The page CSS
is written for a dark ground, so without it a viewer defaulting to light theme
gets light widgets on a dark page.

`tzdata` is in `requirements.txt` deliberately: `app.py` builds
`ZoneInfo("America/New_York")` at import, and on an image without a system tz
database that raises `ZoneInfoNotFoundError` before anything renders.

## Not advice

The brief describes what the scanner nominated, where the levels sit, and what
would confirm or invalidate each one. It doesn't tell you what to buy, how to
size, or where price is going. The levels are the scanner's, the prices are
Alpaca's, and the prose is the model's — all of which can be wrong.
