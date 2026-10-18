# Notes for Claude

## Gemini tools (`gemini_tools.py`)

The user wants these used whenever they ask for an image, notes from a video,
or a podcast. Setup each session: `pip install -q -r requirements-tools.txt`.
The key is a cloud-environment network secret (header `x-goog-api-key` on
`generativelanguage.googleapis.com`), so `GEMINI_API_KEY` is normally unset here
and that's expected. "API key not valid" means the secret is missing or misconfigured.
Never put the key in the repo or chat.

- "Make an image of X" -> `python gemini_tools.py image "<detailed prompt>" [--aspect 16:9] [--ref file]`
- "Notes from this video" -> `python gemini_tools.py video-notes <youtube url | file> [--focus ...]`
- "Make a podcast" -> `python gemini_tools.py podcast-pack <notes...> --title ... --focus ...`,
  then walk the user through the NotebookLM steps it prints (no NotebookLM API; the
  free app with their Google AI Pro plan makes the Audio Overview).

Images cost money: cap is 30/month, counted in `media/images/log.jsonl`. Commit
`media/` after generating, or the next session's count resets. Never pass
`--over-cap` unless the user explicitly asks to exceed the cap.
