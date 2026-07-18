"""
app.py
------
Market Brief.

A single page: pick a session, hit generate, read what the scanner's board
actually means. The board itself lives in the strat-alerts app; this is the
write-up, and it is deliberately a separate deployment with a separate repo.

Run it:  streamlit run app.py

The facts are gathered deterministically before the model is ever called, and
the exact JSON handed over is one expander away at the bottom of the page. The
model writes prose; it does not decide what is true. See brief.py.
"""

from __future__ import annotations

import hmac
import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import streamlit as st

import brief
import quotes

# Load .env before anything reads os.getenv. Without this the file is inert and
# the app reports "no key" while a perfectly good .env sits next to it.
# Deployed (Streamlit Cloud) there is no .env and this is a no-op -- _secret()
# reads st.secrets first there anyway.
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # optional dependency; st.secrets / real env still work
    pass

ET = ZoneInfo("America/New_York")

st.set_page_config(page_title="Market Brief", page_icon="📄", layout="centered")

# Styling the brief body is fiddlier than it looks. A raw <div class="brief">
# can't wrap st.write_stream -- Streamlit closes every element in its own
# container, so the div would open and shut around nothing. So the body is a
# real st.container(border=True), scoped by planting an empty .brief-body
# marker inside it and selecting the container that :has() it.
#
# The marker is load-bearing, not decoration: st.container(border=True) and
# st.expander BOTH render as [data-testid="stLayoutWrapper"], so selecting that
# testid alone would paint the facts expander teal as well.
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter+Tight:wght@400;600;700;800&display=swap');

:root {
  --bg:#0d1319; --surface:#18212c; --surface-2:#243040; --line:#31405280;
  --text:#f1f6fb; --dim:#a8bacd; --faint:#7f93a8;
  --teal:#4ecdc4; --amber:#ffc043; --bull:#3fe08a; --bear:#ff6b62;
}
.stApp { background:var(--bg); }
html, body, [class*="css"] { font-family:'Inter Tight',system-ui,sans-serif; }

[data-testid="stMarkdownContainer"] h1 { color:var(--text) !important; font-weight:800;
  letter-spacing:-.03em; font-size:2.3rem; margin-bottom:.2rem; }

/* The generated brief. Roomier type on purpose: this is the one thing here you
   READ rather than scan, so it should not look like another data panel. */
[data-testid="stLayoutWrapper"]:has(.brief-body) {
  background:var(--surface) !important; border:1px solid var(--line) !important;
  border-left:3px solid var(--teal) !important; border-radius:8px !important;
  padding:.6rem 1.5rem 1rem !important; margin-top:1.1rem;
}
/* Streamlit puts its own 1px border on the container's inner div; ours replaces it. */
[data-testid="stLayoutWrapper"]:has(.brief-body) > div { border:none !important; }
/* The marker is invisible and must not leave a gap at the top. */
.brief-body { display:none; }
[data-testid="stLayoutWrapper"]:has(.brief-body)
  [data-testid="stElementContainer"]:has(.brief-body) { display:none; }

[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] p {
  color:var(--text) !important; font-size:1.02rem !important; line-height:1.65; }
[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] li {
  color:var(--text) !important; font-size:1rem !important; line-height:1.6; }
[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] h1,
[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] h2,
[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] h3 {
  color:var(--teal) !important; font-size:.78rem !important; font-weight:800;
  text-transform:uppercase; letter-spacing:.14em; margin:1.3rem 0 .4rem; }
[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] code {
  font-family:'IBM Plex Mono',monospace; background:var(--surface-2);
  color:var(--text) !important; padding:.08rem .3rem; border-radius:3px; font-size:.9em; }
[data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] strong {
  color:#ffffff !important; }

.empty { border:1px dashed var(--line); border-radius:8px; padding:3.2rem 1rem;
         text-align:center; font-family:'IBM Plex Mono',monospace;
         font-size:.78rem !important; letter-spacing:.16em; text-transform:uppercase;
         color:var(--faint) !important; margin-top:1.1rem; }

.facts { display:flex; gap:2.4rem; flex-wrap:wrap; padding:.9rem 0 1.1rem;
         border-bottom:1px solid var(--line); margin-bottom:.4rem; }
.f .k { display:block !important; font-size:.64rem !important; text-transform:uppercase;
        letter-spacing:.13em; color:var(--dim) !important; font-weight:700; margin-bottom:.2rem; }
.f .v { display:block !important; font-family:'IBM Plex Mono',monospace;
        font-size:1.15rem !important; font-weight:700; color:var(--text) !important;
        font-variant-numeric:tabular-nums; }
.f .v.teal { color:var(--teal) !important; }
.f .v.amber { color:var(--amber) !important; }
.f .v.zero { color:var(--faint) !important; }

div.stButton > button { width:100%; background:var(--teal); color:#082222 !important;
        border:none; border-radius:7px; padding:.7rem 1rem; font-weight:800;
        letter-spacing:.14em; text-transform:uppercase; font-size:.78rem;
        font-family:'IBM Plex Mono',monospace; }
div.stButton > button:hover { background:#63ded5; color:#082222 !important; }
div.stButton > button:disabled { background:var(--surface-2); color:var(--faint) !important; }

@media (max-width: 640px) {
  [data-testid="stMarkdownContainer"] h1 { font-size:1.8rem; }
  [data-testid="stLayoutWrapper"]:has(.brief-body) { padding:.6rem 1.1rem 1rem !important; }
  [data-testid="stLayoutWrapper"]:has(.brief-body) [data-testid="stMarkdownContainer"] p {
    font-size:.95rem !important; }
  .facts { gap:1.3rem; }
  .f .v { font-size:1rem !important; }
}
</style>
""", unsafe_allow_html=True)


# --------------------------------------------------------------------------
# config
# --------------------------------------------------------------------------

def _secret(name: str, default: str = "") -> str:
    """st.secrets first (that's how this deploys), env second (that's how it
    runs locally, via .env)."""
    try:
        if name in st.secrets:
            return str(st.secrets[name])
    except Exception:
        pass  # no secrets.toml at all -- fine, fall through to env
    return os.getenv(name, default)


def gate() -> bool:
    """
    Optional password gate. Returns True when the page may render.

    Why this exists: a deployed Streamlit app is reachable by anyone with the
    URL, and this page has a button that spends real money on someone else's
    behalf -- every Generate is an Opus call billed to the key in Secrets. An
    unprotected deployment is a stranger's free credit line.

    Opt-in by presence: set APP_PASSWORD and the gate turns on; leave it unset
    and the app is open, which is what you want on localhost. If it's unset the
    page nags, so an unprotected deployment announces itself instead of quietly
    costing money.
    """
    expected = _secret("APP_PASSWORD")
    if not expected:
        return True                      # open; the caller renders the warning
    if st.session_state.get("unlocked"):
        return True

    st.markdown("# Market Brief")
    pwd = st.text_input("Password", type="password", label_visibility="collapsed",
                        placeholder="Password")
    # The button exists to give people something to click. It doesn't gate the
    # check -- Streamlit reruns on Enter too, and `pwd` survives either way, so
    # the check below runs on whichever path the user took.
    st.button("Unlock", type="primary")
    if pwd:
        # compare_digest so a wrong guess can't be timed character by character
        if hmac.compare_digest(pwd, expected):
            st.session_state["unlocked"] = True
            st.rerun()
        else:
            st.error("Incorrect password.")
    return False


if not gate():
    st.stop()


@st.cache_data(ttl=60, show_spinner=False)
def build_facts(bucket: int, near_misses: bool) -> dict:
    """
    `bucket` is the minute this call falls in. It exists purely to key the
    cache, so mashing Generate doesn't re-fetch on every click -- but a minute is
    short enough that prices stay meaningfully live.

    `near_misses` is part of the cache key, so switching to Study rebuilds
    rather than serving the live brief's slimmer fact sheet.
    """
    scan = brief.load_scan(int(time.time()), _secret("SCAN_URL", brief.SCAN_URL))

    wanted = set(brief.CONTEXT_SYMBOLS) | {
        l.get("symbol") for l in scan.get("armed_levels", []) if l.get("symbol")
    }
    if near_misses:
        # Study quotes the rejected patterns too, so their symbols need prices.
        wanted |= {
            s["symbol"] for s in scan.get("symbols", [])
            if s.get("symbol") and s.get("rejected")
        }
    live = quotes.latest_prices(
        sorted(wanted),
        _secret("ALPACA_API_KEY"),
        _secret("ALPACA_SECRET_KEY"),
        _secret("ALPACA_DATA_FEED", "iex"),
    )
    now_et = datetime.now(ET).strftime("%Y-%m-%d %H:%M ET (%A)")
    return brief.gather(scan, live, now_et, include_near_misses=near_misses)


# --------------------------------------------------------------------------
# page
# --------------------------------------------------------------------------

st.markdown("# Market Brief")

anthropic_key = _secret("ANTHROPIC_API_KEY")

# Deployed and unprotected means anyone with the URL can spend the key in
# Secrets. Harmless on localhost, so this is a nag rather than a block -- and it
# disappears the moment APP_PASSWORD is set.
if not _secret("APP_PASSWORD"):
    st.caption("⚠️ No APP_PASSWORD set — if this is deployed, anyone with the "
               "URL can generate briefs on your Anthropic key.")

# Morning and Afternoon are session-time briefs. Study is intent -- read the
# board with the market shut, including what the scanner REJECTED and why.
session = st.segmented_control(
    "Session", ["Morning", "Afternoon", "Study"], default="Morning",
    label_visibility="collapsed",
) or "Morning"
session_key = session.lower()

try:
    facts = build_facts(int(time.time() // 60), session_key == "study")
except Exception as e:
    st.error(f"Couldn't load the scan: {e}")
    st.caption("This app reads latest_scan.json published by the strat-alerts "
               "scanner. Check that its workflow has run and committed the file.")
    st.stop()

levels = facts["armed_levels"]
n1 = sum(1 for l in levels if l["tier"] == "TIER1")
n2 = sum(1 for l in levels if l["tier"] == "TIER2")
scan_at = str(facts["scan_generated_et"] or "")[:16].replace("T", " ")

st.markdown(f"""
<div class="facts">
  <span class="f"><span class="k">Armed</span>
    <span class="v {'teal' if levels else 'zero'}">{len(levels)}</span></span>
  <span class="f"><span class="k">Tier 1 · live</span>
    <span class="v {'amber' if n1 else 'zero'}">{n1}</span></span>
  <span class="f"><span class="k">Tier 2 · 15m</span>
    <span class="v {'teal' if n2 else 'zero'}">{n2}</span></span>
  {f'''<span class="f"><span class="k">Near miss</span>
    <span class="v {'amber' if facts.get('near_misses') else 'zero'}">{len(facts.get('near_misses', []))}</span></span>'''
   if 'near_misses' in facts else ''}
  <span class="f"><span class="k">Context</span>
    <span class="v {'' if facts['index_context'] else 'zero'}">{len(facts['index_context'])}/{len(brief.CONTEXT_SYMBOLS)}</span></span>
  <span class="f"><span class="k">Prices</span>
    <span class="v {'' if facts['live_prices_used'] else 'zero'}">
      {'LIVE' if facts['live_prices_used'] else 'SCAN'}</span></span>
  <span class="f"><span class="k">Last scan</span><span class="v">{scan_at[-5:] or '—'}</span></span>
</div>
""", unsafe_allow_html=True)

# The scan carries a per-symbol block with each frame's last closed bar; that is
# the entire source of index context. It comes back empty when the scanner's run
# failed to fetch (its process_symbol swallows the exception and emits nothing),
# and the result is a brief with no structure to talk about. Say so, rather than
# letting a thin brief look like a quiet market.
if not facts["index_context"]:
    st.warning(
        f"No index context — the last scan published no per-symbol data, so "
        f"there are no prior 4H/Daily extremes for "
        f"{'/'.join(brief.CONTEXT_SYMBOLS)}. The brief will be thin. Check that "
        f"the scanner's last run actually fetched bars."
    )

if not anthropic_key:
    st.error("No ANTHROPIC_API_KEY — the brief can't be written.")
    st.caption("Add it to .streamlit/secrets.toml (or the app's Secrets on "
               "Streamlit Cloud), or put it in .env locally. The facts above are "
               "already loaded; only the write-up needs the key.")
elif not facts["live_prices_used"]:
    st.warning("No live prices — briefing off the scan's own prices, which are "
               "as old as the last scan. Set ALPACA_API_KEY / ALPACA_SECRET_KEY "
               "for live quotes.")

go = st.button(f"⚡ Generate {session} Brief", disabled=not anthropic_key)

# Keyed by session, so switching Morning/Afternoon never shows you the other
# one's brief under the wrong heading.
slot = f"brief_text_{session_key}"
MARKER = '<span class="brief-body"></span>'  # what the CSS above scopes to

if go:
    with st.container(border=True):
        st.markdown(MARKER, unsafe_allow_html=True)
        try:
            st.session_state[slot] = st.write_stream(
                brief.write(facts, session_key, anthropic_key)
            )
        except Exception as e:
            st.session_state.pop(slot, None)
            st.error(f"Claude didn't answer: {e}")
elif st.session_state.get(slot):
    with st.container(border=True):
        st.markdown(MARKER, unsafe_allow_html=True)
        st.markdown(st.session_state[slot])
else:
    st.markdown('<div class="empty">Pick a session, then hit generate</div>',
                unsafe_allow_html=True)

st.caption(
    f"Written by {brief.MODEL} from the facts below and nothing else — no news "
    f"feed, no data beyond the scan and last-trade prices. Levels and tiers are "
    f"the scanner's; prices are live; the prose is the model's. Not advice."
)

with st.expander("The exact facts Claude was given"):
    st.json(facts)
