"""
render.py
---------
The card layout. All presentation, no decisions.

Everything here draws values that were already computed -- prices and percent
changes from Alpaca, levels and structure from the scan, the VIX from its own
source. The only model-written text on the page is the per-symbol `read` and the
macro block, and both arrive as plain strings that get placed into a card rather
than shaping one.

That split is the point of the whole app: a number on screen can be traced to a
source, so the layout never has to be audited for truth, only for looks.
"""

from __future__ import annotations

import html
import re

import streamlit as st

CSS = """
<style>
.sec { font-family:'IBM Plex Mono',monospace; font-size:.66rem !important;
       font-weight:700; letter-spacing:.2em; text-transform:uppercase;
       color:var(--faint) !important; margin:1.7rem 0 .55rem; }

.card { background:var(--surface); border:1px solid var(--line);
        border-radius:9px; padding:.95rem 1.1rem; margin-bottom:.6rem; }
.card.bull { border-left:3px solid var(--bull); }
.card.bear { border-left:3px solid var(--bear); }
.card.flat { border-left:3px solid var(--slate); }
.card.muted{ border-left:3px solid #3b4a5e; }
.card.teal { border-left:3px solid var(--teal); }

.sym  { font-family:'IBM Plex Mono',monospace; font-size:.72rem !important;
        letter-spacing:.14em; color:var(--dim) !important; font-weight:700; }
.px   { font-family:'Inter Tight',sans-serif; font-size:1.7rem !important;
        font-weight:800; color:var(--text) !important; letter-spacing:-.02em;
        display:inline-block; margin-right:.5rem; }
.chg  { font-family:'IBM Plex Mono',monospace; font-size:.86rem !important;
        font-weight:700; }
.chg.up { color:var(--bull) !important; } .chg.down { color:var(--bear) !important; }
.chg.zero { color:var(--faint) !important; }

.badge { display:inline-block; font-family:'IBM Plex Mono',monospace;
         font-size:.6rem !important; font-weight:700; letter-spacing:.11em;
         text-transform:uppercase; padding:.24rem .5rem; border-radius:4px;
         margin:.35rem .35rem 0 0; }
.badge.bull { background:rgba(63,224,138,.16); color:var(--bull) !important; }
.badge.bear { background:rgba(255,107,98,.16); color:var(--bear) !important; }
.badge.flat { background:rgba(125,144,168,.18); color:#c3d0de !important; }
.badge.teal { background:rgba(78,205,196,.16); color:var(--teal) !important; }
.badge.amber{ background:rgba(255,192,67,.16); color:var(--amber) !important; }
.badge.muted{ background:rgba(125,144,168,.12); color:var(--faint) !important; }

.read { margin:.6rem 0 0; font-size:.9rem !important; line-height:1.55;
        color:var(--dim) !important; }

.lvls { display:flex; gap:1.8rem; flex-wrap:wrap; margin-top:.75rem;
        padding-top:.6rem; border-top:1px solid var(--line); }
.lvl .k { display:block !important; font-family:'IBM Plex Mono',monospace;
          font-size:.56rem !important; letter-spacing:.13em; font-weight:700;
          color:var(--faint) !important; text-transform:uppercase; }
.lvl .v { display:block !important; font-family:'IBM Plex Mono',monospace;
          font-size:.86rem !important; font-weight:700; margin-top:.12rem;
          font-variant-numeric:tabular-nums; }
.lvl .v.r  { color:var(--bear) !important; }
.lvl .v.s  { color:var(--bull) !important; }
.lvl .v.n  { color:var(--text) !important; }
.lvl .v.a  { color:var(--amber) !important; }

/* VIX panel -- the one card whose colour is a judgement about risk, so the
   thresholds live in code (see _vix_state) rather than in a prompt. */
.vix { display:flex; gap:1.2rem; align-items:center; flex-wrap:wrap; }
.vix .n { font-family:'Inter Tight',sans-serif; font-size:2.4rem !important;
          font-weight:800; letter-spacing:-.03em; }
.vix .n.ok   { color:var(--bull) !important; }
.vix .n.warn { color:var(--amber) !important; }
.vix .n.bad  { color:var(--bear) !important; }
.vix .body { flex:1; min-width:220px; }

.drv { background:var(--surface); border:1px solid var(--line);
       border-left:3px solid var(--bear); border-radius:8px;
       padding:.8rem 1rem; margin-bottom:.55rem; }
.drv.medium { border-left-color:var(--amber); }
.drv.low    { border-left-color:var(--slate); }
.drv .t { font-weight:700; color:var(--text) !important; font-size:.95rem; }
.drv .b { color:var(--dim) !important; font-size:.86rem; line-height:1.5;
          margin-top:.25rem; }

.srcs { font-family:'IBM Plex Mono',monospace; font-size:.62rem !important;
        color:var(--faint) !important; line-height:1.7; word-break:break-all; }
</style>
"""


def _chg(v) -> str:
    if v is None:
        return '<span class="chg zero">—</span>'
    cls = "up" if v > 0 else ("down" if v < 0 else "zero")
    return f'<span class="chg {cls}">{v:+.2f}%</span>'


def _vix_state(level: float) -> tuple[str, str, str]:
    """
    (css class, badge text, one-line meaning).

    Thresholds are the conventional ones -- 20 is where index option pricing
    starts implying daily ranges that run stops set for a calm tape, 30 is
    where correlations go to one. Hard-coded because a risk threshold should be
    a rule the reader can look up, not a sentence the model chose today.
    """
    if level < 20:
        return "ok", "TRADEABLE", "Below the 20 line: ranges are normal for the setups this scanner nominates."
    if level < 30:
        return "warn", "CAUTION", "Between 20 and 30: implied ranges are wide enough to run a stop sized for a calm tape."
    return "bad", "RISK-OFF", "Above 30: correlations tighten and single-name structure matters less than the tape."


def _lvl(k: str, v, cls: str = "n") -> str:
    if v is None:
        return ""
    txt = f"{v:.2f}" if isinstance(v, (int, float)) else html.escape(str(v))
    return f'<span class="lvl"><span class="k">{html.escape(k)}</span><span class="v {cls}">{txt}</span></span>'


def _vix_card(v: dict) -> None:
    cls, badge, meaning = _vix_state(v["level"])
    chg = _chg(v.get("change_pct"))
    st.markdown('<div class="sec">Volatility filter</div>', unsafe_allow_html=True)
    st.markdown(f"""
<div class="card teal">
  <div class="vix">
    <span class="n {cls}">{v['level']:.2f}</span>
    <div class="body">
      <span class="badge {'bull' if cls=='ok' else ('amber' if cls=='warn' else 'bear')}">{badge}</span>
      <span class="chg {'up' if (v.get('change_pct') or 0)>0 else 'down'}">{chg}</span>
      <div class="read">{html.escape(meaning)} Prior close {v['prev_close']:.2f}.</div>
    </div>
  </div>
</div>""", unsafe_allow_html=True)


def _index_card(c: dict, read: str) -> None:
    price = f"${c['price']:,.2f}" if c.get("price") is not None else "—"
    lvls = "".join([
        _lvl("R1", c.get("r1"), "r"),
        _lvl("S1", c.get("s1"), "s"),
        _lvl("Key", c.get("key_levels") or None, "n"),
    ])
    st.markdown(f"""
<div class="card {c['tone']}">
  <div class="sym">{html.escape(c['symbol'])}</div>
  <div><span class="px">{price}</span>{_chg(c.get('change_pct'))}</div>
  <span class="badge {c['tone']}">{html.escape(c['status'])}</span>
  <div class="read">{html.escape(read)}</div>
  <div class="lvls">{lvls}</div>
</div>""", unsafe_allow_html=True)


def _setup_card(s: dict) -> None:
    price = f"${s['price']:,.2f}" if s.get("price") is not None else "—"
    tone = s.get("tone", "flat")
    badges = "".join(
        f'<span class="badge {"muted" if s["kind"]=="rejected" else tone}">{html.escape(b)}</span>'
        for b in s.get("badges", [])
    )
    if s["kind"] == "armed":
        lvls = "".join([
            _lvl("Trigger", s.get("trigger"), "n"), _lvl("Stop", s.get("stop"), "r"),
            _lvl("+1R", s.get("scale"), "a"), _lvl("Runner", s.get("target"), "s"),
            _lvl("Runway", f"{s['runway_r']:.1f}R" if s.get("runway_r") else None, "s"),
            _lvl("Score", s.get("score"), "n"),
        ])
    else:
        need = s.get("runway_required")
        got = s.get("runway_r")
        lvls = "".join([
            _lvl("Trigger", s.get("trigger"), "n"),
            _lvl("Runway", f"{got:.1f}R / {need:.1f}R" if got and need else None, "r"),
            _lvl("Met", f"{s['fraction_of_gate_met']:.2f}" if s.get("fraction_of_gate_met") else None, "a"),
        ])
    reason = (s.get("reasons") or [""])[0] if s["kind"] == "rejected" else ""
    st.markdown(f"""
<div class="card {'muted' if s['kind']=='rejected' else tone}">
  <div class="sym">{html.escape(s['symbol'])}</div>
  <div><span class="px">{price}</span>{_chg(s.get('change_pct'))}</div>
  {badges}
  {f'<div class="read">{html.escape(reason)}</div>' if reason else ''}
  <div class="lvls">{lvls}</div>
</div>""", unsafe_allow_html=True)


_DRIVER_RE = re.compile(
    r"TITLE:\s*(?P<t>.+?)\s*\n+\s*BODY:\s*(?P<b>.+?)\s*\n+\s*IMPACT:\s*(?P<i>high|medium|low)",
    re.I | re.S,
)


def _macro(text: str, sources: list[str]) -> None:
    """
    Render the searched drivers. If the model's formatting drifts, fall back to
    printing what it wrote -- a slightly ugly panel beats a blank one, and the
    text is real either way.
    """
    text = text or ""
    # The model narrates its searching ("I'll look that up...", "the tool limit
    # was hit") no matter how firmly the prompt forbids it, and that preamble is
    # not something a reader should see. Cutting it here is deterministic;
    # asking again is not.
    first = text.find("TITLE:")
    if first > 0:
        text = text[first:]

    drivers = list(_DRIVER_RE.finditer(text))
    st.markdown('<div class="sec">Macro drivers · from live web search</div>',
                unsafe_allow_html=True)
    if not drivers:
        st.markdown(f'<div class="card flat"><div class="read">{html.escape(text or "Nothing returned.")}</div></div>',
                    unsafe_allow_html=True)
    for m in drivers:
        imp = m.group("i").lower()
        st.markdown(f"""
<div class="drv {imp}">
  <div class="t">{html.escape(m.group('t').strip())}</div>
  <div class="b">{html.escape(' '.join(m.group('b').split()))}</div>
</div>""", unsafe_allow_html=True)

    cal = re.search(r"CALENDAR:\s*(.+)", text or "", re.I | re.S)
    if cal:
        body = cal.group(1).strip().split("TITLE:")[0].strip()
        if body:
            st.markdown('<div class="sec">Economic calendar</div>', unsafe_allow_html=True)
            st.markdown(f'<div class="card flat"><div class="read">{html.escape(body)}</div></div>',
                        unsafe_allow_html=True)
    if sources:
        with st.expander(f"Sources ({len(sources)})"):
            st.markdown('<div class="srcs">' + "<br>".join(html.escape(u) for u in sources) + "</div>",
                        unsafe_allow_html=True)


def brief(data: dict, session: str) -> None:
    """Draw the whole page from an already-built payload."""
    st.markdown(CSS, unsafe_allow_html=True)
    reads = data.get("reads") or {}
    by_symbol = {r["symbol"]: r["read"] for r in reads.get("reads", [])}

    if data.get("vix"):
        _vix_card(data["vix"])

    if reads.get("market_condition"):
        st.markdown('<div class="sec">Market condition</div>', unsafe_allow_html=True)
        st.markdown(f"""
<div class="card teal">
  <span class="badge teal">{html.escape(reads.get('condition_label', 'Read'))}</span>
  <div class="read">{html.escape(reads['market_condition'])}</div>
</div>""", unsafe_allow_html=True)

    if data.get("cards"):
        st.markdown('<div class="sec">Index ETF read</div>', unsafe_allow_html=True)
        for c in data["cards"]:
            _index_card(c, by_symbol.get(c["symbol"], ""))

    _macro(data.get("macro", ""), data.get("sources", []))

    setups = data.get("setups") or []
    if setups:
        armed = [s for s in setups if s["kind"] == "armed"]
        rejected = [s for s in setups if s["kind"] == "rejected"]
        if armed:
            st.markdown('<div class="sec">Armed levels</div>', unsafe_allow_html=True)
            for s in armed:
                _setup_card(s)
        if rejected:
            st.markdown(
                f'<div class="sec">Rejected setups · study only · {len(rejected)} total</div>',
                unsafe_allow_html=True)
            st.caption("These did NOT clear the gates. No stop, target or score was "
                       "computed for them — they are here to show why the board is "
                       "empty, not to be traded.")
            for s in rejected[:12]:
                _setup_card(s)
            if len(rejected) > 12:
                st.caption(f"Showing the 12 closest to passing of {len(rejected)}.")
