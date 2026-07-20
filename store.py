"""
store.py
--------
Saved briefs, so one survives the browser tab that made it.

WHY THIS EXISTS
===============
A generated brief lived only in st.session_state, which is per browser session.
Generate one at the desk, open the app on another device, and it's gone -- you
pay for a second generate to read what you already had. Streamlit Cloud can't
fix this locally either: its filesystem is ephemeral and wiped on restart, so
"just write a file" survives neither a redeploy nor a device change.

WHY GITHUB
==========
It's the only durable store already in this stack. The scanner has published
latest_scan.json to a repo for months; this is the same trick pointed at a
different file. No database to run, no new service to sign up for, free, and
you get version history and a readable audit trail for nothing.

Writes go through the Contents API rather than git, because the deployed app has
no checkout to commit from.

EVERY OPERATION FAILS SOFT
==========================
History is a convenience wrapped around the real product. If the token is
missing, wrong, or GitHub is down, saving and listing both no-op and the app
behaves exactly as it did before this file existed. A brief you can't archive is
still a brief; an app that won't render because archiving broke is not.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Optional

import requests

logger = logging.getLogger("market_brief.store")

API = "https://api.github.com"
DIR = "briefs"


def _headers(token: str) -> dict:
    return {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}


def _slug(saved_at: str, session: str) -> str:
    """
    briefs/2026-07-19T2100-study.json

    Sorts chronologically as plain text, which is the whole reason for the
    layout: listing a directory gives history in order with no metadata to
    parse and no index file to keep in sync.
    """
    stamp = saved_at.replace(":", "").replace(" ", "T")[:15]
    return f"{DIR}/{stamp}-{session.lower()}.json"


def save(payload: dict, session: str, saved_at: str, token: str, repo: str) -> Optional[str]:
    """Archive one brief. Returns its path, or None if it couldn't be saved."""
    if not (token and repo):
        return None
    path = _slug(saved_at, session)
    body = {
        "message": f"brief: {session} {saved_at}",
        "content": base64.b64encode(
            json.dumps({**payload, "session": session, "saved_at": saved_at},
                       default=str).encode()
        ).decode(),
    }
    try:
        r = requests.put(f"{API}/repos/{repo}/contents/{path}",
                         headers=_headers(token), json=body, timeout=25)
        if r.status_code >= 300:
            # 409 means two saves raced for the same second; harmless.
            logger.warning("brief save failed (%s): %s", r.status_code, r.text[:160])
            return None
        return path
    except Exception:
        logger.exception("brief save failed")
        return None


def history(token: str, repo: str, limit: int = 40) -> list[dict]:
    """
    [{path, label, session, saved_at}], newest first.

    Reads only the directory listing, not the briefs themselves -- the payloads
    are large and the picker just needs labels.
    """
    if not (token and repo):
        return []
    try:
        r = requests.get(f"{API}/repos/{repo}/contents/{DIR}",
                         headers=_headers(token), timeout=25)
        if r.status_code == 404:
            return []                      # nothing archived yet
        r.raise_for_status()
        files = [f for f in r.json() if f["name"].endswith(".json")]
    except Exception:
        logger.exception("brief history failed")
        return []

    out = []
    for f in sorted(files, key=lambda f: f["name"], reverse=True)[:limit]:
        stem = f["name"][:-5]
        stamp, _, session = stem.rpartition("-")
        try:
            date, _, hhmm = stamp.partition("T")
            pretty = f"{date} {hhmm[:2]}:{hhmm[2:4]} · {session.title()}"
        except Exception:
            pretty = stem
        out.append({"path": f["path"], "label": pretty,
                    "session": session, "saved_at": stamp})
    return out


def load(path: str, token: str, repo: str) -> Optional[dict]:
    """Fetch one archived brief by path."""
    if not (token and repo and path):
        return None
    try:
        r = requests.get(f"{API}/repos/{repo}/contents/{path}",
                         headers=_headers(token), timeout=25)
        r.raise_for_status()
        return json.loads(base64.b64decode(r.json()["content"]).decode())
    except Exception:
        logger.exception("brief load failed for %s", path)
        return None
