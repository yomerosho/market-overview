"""
gemini_tools.py
---------------
Three Gemini helpers that sit beside the brief: Nano Banana images, notes from
a video, and a source pack for a NotebookLM podcast.

    python gemini_tools.py image "a trading desk at dawn, cinematic" [--aspect 16:9]
    python gemini_tools.py video-notes https://www.youtube.com/watch?v=...  (or a local file)
    python gemini_tools.py podcast-pack media/notes/a.md media/notes/b.md --title "Week in review"
    python gemini_tools.py models          # what this key can call
    python gemini_tools.py usage           # images used this month

Needs the Gemini key: a network secret in the cloud (see _client), or
GEMINI_API_KEY locally. Everything lands under media/ so it can be committed.

COST GUARD
==========
Images are the only paid call that adds up (cents each). The monthly cap lives
in media/images/log.jsonl, counted per calendar month, and that file is
committed with the images -- a cloud session's disk is thrown away, so a
counter kept anywhere else would reset every session and cap nothing. Raise or
lower it with GEMINI_IMAGE_MONTHLY_CAP. The real backstop is still the prepaid
balance in AI Studio; this just keeps us well under it.

WHY THE PODCAST IS A PACK, NOT AN API CALL
==========================================
NotebookLM's API is Enterprise-only (a paid Cloud licence). The consumer app,
included with Google AI Pro, makes the Audio Overview for free. So this builds
the one document to upload there, plus the steering prompt to paste into
"Customize", and stops.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import mimetypes
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MEDIA = ROOT / "media"
IMAGES = MEDIA / "images"
NOTES = MEDIA / "notes"
PODCASTS = MEDIA / "podcasts"
IMAGE_LOG = IMAGES / "log.jsonl"

# Overridable so a renamed or retired model is an env change, not a code change.
# `python gemini_tools.py models` lists what the key can actually reach.
TEXT_MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.8-flash")
IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")
IMAGE_CAP = int(os.environ.get("GEMINI_IMAGE_MONTHLY_CAP", "30"))

NOTES_PROMPT = """Watch this video and write study notes in Markdown.

# <the video's title, or a short descriptive one>

**Source:** <url or filename> · **Length:** <mm:ss if known>

## TL;DR
3-5 bullets: what someone must walk away with.

## Notes
Section by section, in the video's order. Each section header carries its
start timestamp, e.g. "### 04:12 — Setting the stop". Keep the speaker's
numbers, names, tickers and definitions exactly; say what was shown on screen
(charts, slides, code) when it matters.

## Key terms
Term — one-line definition, only for terms the video actually uses.

## Action items / things to check
Anything the viewer is told to do, try or verify.

Do not invent anything that is not in the video. If audio is unclear, say so."""


def _client():
    # In the cloud environment the real key is a network secret: the proxy adds
    # the x-goog-api-key header to requests for generativelanguage.googleapis.com,
    # and the key itself never enters the session. The SDK still insists on a
    # key, so it gets a placeholder that the proxy's header takes the place of.
    # Locally, GEMINI_API_KEY in .env works as usual.
    from google import genai

    return genai.Client(api_key=os.environ.get("GEMINI_API_KEY") or "set-by-network-secret")


def _slug(text: str, limit: int = 50) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:limit].rstrip("-") or "untitled"


def _stamp() -> str:
    return dt.datetime.now().strftime("%Y-%m-%dT%H%M%S")


def _hint_on_missing_model(err: Exception, model: str) -> None:
    if "404" in str(err) or "not found" in str(err).lower():
        print(f"\nModel '{model}' isn't available to this key. Run `python gemini_tools.py models` "
              f"and set GEMINI_IMAGE_MODEL / GEMINI_TEXT_MODEL to one it lists.", file=sys.stderr)


# --- images -------------------------------------------------------------------

def _images_this_month() -> int:
    if not IMAGE_LOG.exists():
        return 0
    month = dt.date.today().strftime("%Y-%m")
    with IMAGE_LOG.open() as f:
        return sum(1 for line in f if line.strip() and json.loads(line)["at"].startswith(month))


def cmd_image(args) -> None:
    used = _images_this_month()
    if used + args.n > IMAGE_CAP and not args.over_cap:
        sys.exit(f"Monthly image cap reached: {used}/{IMAGE_CAP} used this month. "
                 f"Pass --over-cap to go past it deliberately, or raise GEMINI_IMAGE_MONTHLY_CAP.")

    from google.genai import types

    client = _client()
    config = types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
        image_config=types.ImageConfig(aspect_ratio=args.aspect) if args.aspect else None,
    )
    contents: list = [args.prompt]
    for ref in args.ref or []:
        # Reference images: "put this logo on...", "edit this photo so...".
        contents.append(types.Part.from_bytes(data=Path(ref).read_bytes(),
                                              mime_type=mimetypes.guess_type(ref)[0] or "image/png"))

    IMAGES.mkdir(parents=True, exist_ok=True)
    base = f"{_stamp()}-{_slug(args.prompt)}"
    saved = []
    for i in range(args.n):
        try:
            resp = client.models.generate_content(model=IMAGE_MODEL, contents=contents, config=config)
        except Exception as e:
            _hint_on_missing_model(e, IMAGE_MODEL)
            raise
        parts = (resp.candidates or [None])[0]
        parts = parts.content.parts if parts and parts.content else []
        images = [p for p in parts if p.inline_data and p.inline_data.data]
        if not images:
            text = " ".join(p.text for p in parts if p.text) or "no image returned (likely blocked by safety filters)"
            print(f"[{i + 1}/{args.n}] {text}", file=sys.stderr)
            continue
        for j, p in enumerate(images):
            ext = mimetypes.guess_extension(p.inline_data.mime_type or "image/png") or ".png"
            path = IMAGES / f"{base}{'-' + str(i + 1) if args.n > 1 else ''}{'-' + str(j + 1) if j else ''}{ext}"
            path.write_bytes(p.inline_data.data)
            saved.append(path)
        # One log line per billed call, whatever it returned.
        with IMAGE_LOG.open("a") as f:
            f.write(json.dumps({"at": dt.datetime.now().isoformat(timespec="seconds"),
                                "model": IMAGE_MODEL, "prompt": args.prompt,
                                "files": [str(s.relative_to(ROOT)) for s in saved[-len(images):]]}) + "\n")

    for s in saved:
        print(s.relative_to(ROOT))
    print(f"Images this month: {_images_this_month()}/{IMAGE_CAP}", file=sys.stderr)


# --- video notes --------------------------------------------------------------

def _video_part(client, source: str):
    from google.genai import types

    if re.match(r"https?://", source):
        # Gemini fetches YouTube links itself; nothing to download.
        return types.Part(file_data=types.FileData(file_uri=source))
    path = Path(source)
    if not path.exists():
        sys.exit(f"No such file: {source}")
    f = client.files.upload(file=path)
    while f.state and f.state.name == "PROCESSING":
        time.sleep(3)
        f = client.files.get(name=f.name)
    if f.state and f.state.name == "FAILED":
        sys.exit(f"Gemini couldn't process {source}.")
    return types.Part(file_data=types.FileData(file_uri=f.uri, mime_type=f.mime_type))


def cmd_video_notes(args) -> None:
    client = _client()
    prompt = NOTES_PROMPT + (f"\n\nExtra focus from the reader: {args.focus}" if args.focus else "")
    try:
        resp = client.models.generate_content(
            model=TEXT_MODEL, contents=[_video_part(client, args.source), f"Source: {args.source}\n\n{prompt}"])
    except Exception as e:
        _hint_on_missing_model(e, TEXT_MODEL)
        raise
    notes = (resp.text or "").strip()
    if not notes:
        sys.exit("Gemini returned no notes for this video.")
    title = next((l.lstrip("# ").strip() for l in notes.splitlines() if l.startswith("# ")), args.source)
    NOTES.mkdir(parents=True, exist_ok=True)
    path = NOTES / f"{dt.date.today().isoformat()}-{_slug(title)}.md"
    path.write_text(notes + "\n")
    print(path.relative_to(ROOT))


# --- podcast pack -------------------------------------------------------------

def cmd_podcast_pack(args) -> None:
    sections = []
    for src in args.sources:
        p = Path(src)
        if not p.exists():
            sys.exit(f"No such file: {src}")
        sections.append(f"\n\n---\n\n<!-- source: {p.name} -->\n\n{p.read_text().strip()}")

    title = args.title or "Podcast sources"
    PODCASTS.mkdir(parents=True, exist_ok=True)
    path = PODCASTS / f"{dt.date.today().isoformat()}-{_slug(title)}.md"
    path.write_text(f"# {title}\n" + "".join(sections) + "\n")

    steer = args.focus or "the most useful, practical takeaways"
    print(path.relative_to(ROOT))
    print(f"""
Next, in NotebookLM (notebooklm.google.com):
  1. New notebook -> Add source -> upload {path.name} (or paste its text).
  2. Audio Overview -> Customize, and paste:
       Two hosts, about {args.minutes} minutes, for a listener who knows the basics.
       Focus on {steer}. Use the sources' own numbers and names; don't add facts.
  3. Generate, then download the audio.""")


# --- housekeeping -------------------------------------------------------------

def cmd_models(_args) -> None:
    # Keep a reference: the SDK closes its HTTP client when the Client is
    # garbage-collected, and list() is lazy.
    client = _client()
    for m in client.models.list():
        actions = ",".join(getattr(m, "supported_actions", None) or [])
        print(f"{m.name.removeprefix('models/'):45} {actions}")


def cmd_usage(_args) -> None:
    print(f"Images this month: {_images_this_month()}/{IMAGE_CAP}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("image", help="generate image(s) with Nano Banana")
    p.add_argument("prompt")
    p.add_argument("--aspect", help="e.g. 1:1, 16:9, 9:16, 4:5")
    p.add_argument("--ref", action="append", help="reference image to edit or build from (repeatable)")
    p.add_argument("-n", type=int, default=1, help="how many (each counts toward the cap)")
    p.add_argument("--over-cap", action="store_true", help="go past the monthly cap on purpose")
    p.set_defaults(func=cmd_image)

    p = sub.add_parser("video-notes", help="turn a YouTube link or video file into Markdown notes")
    p.add_argument("source")
    p.add_argument("--focus", help="what to pay most attention to")
    p.set_defaults(func=cmd_video_notes)

    p = sub.add_parser("podcast-pack", help="bundle notes into one NotebookLM source + steering prompt")
    p.add_argument("sources", nargs="+")
    p.add_argument("--title")
    p.add_argument("--focus")
    p.add_argument("--minutes", type=int, default=10)
    p.set_defaults(func=cmd_podcast_pack)

    sub.add_parser("models", help="list models this key can call").set_defaults(func=cmd_models)
    sub.add_parser("usage", help="images used this month").set_defaults(func=cmd_usage)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
