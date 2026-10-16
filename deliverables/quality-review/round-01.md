# Quality review — Round 1

**Focus:** visual language, composition, core narrative
**Render reviewed:** `renders/r1.mp4` (HyperFrames CLI, BeginFrame capture, 60 fps, no motion blur)
**Revised render:** `renders/r2.mp4`

## How this round was reviewed

| Check | Method | Result on r1 |
|---|---|---|
| Container / codec | `ffprobe` on the rendered file | MP4, H.264 High, yuv420p |
| Resolution / fps | `ffprobe` | 1920×1080, 60/1 |
| Frame count | `ffprobe -count_frames` (decoded, not metadata) | **1800** |
| Duration | `ffprobe` (format + stream) | **30.000 s** |
| Audio | `ffprobe` + `ebur128` | AAC 48 kHz stereo, 30.000 s, −16.1 LUFS, −1.4 dBTP |
| Audio offset vs source score | cross-correlation of decoded MP4 audio vs `audio/score.wav` | **0 samples** (encoder priming compensated by the MP4 edit list) |
| Cue onsets | onset detection ±40 ms around each of 75 cues | median 0.0 ms, p95 13 ms, 73/75 within one frame |
| Frames every 0.5 s | `ffmpeg -vf fps=2` → 60 PNGs, 5 contact sheets (`assets/sheet_0*-r1.jpg`) | inspected all |
| Full-resolution stills | 12.0 s (lesson page) and 28.0 s (lockup) at 1920×1080 | inspected |
| Soundtrack | spectrogram + waveform (`assets/score-*-r1.png`), loudness, onset report | analysed (see note) |

> Note on audio review: I cannot hear audio. "Listening" in every round is done with objective
> analysis — spectrogram, waveform, loudness/peak measurement, and per-cue onset timing against the
> shared timeline. Subjective taste on the music should be confirmed by a human listener.

## What worked

- One idea reads end-to-end: caret → line → branching paths → the Python course → the lesson's own
  code → a system → the map of every track → the real check mark.
- Scene 2 paths read as architectural (PCB-style 45° routing, ring nodes that echo the logo).
- The lesson page at full resolution is believable when paused (real header, real lesson list,
  real breadcrumbs/meta row, real syntax colours, Arabic-Indic date as the site renders it).
- The lockup at 28 s is clean; the SVG mark matches the official icon (≈1 % alpha error).

## Weaknesses found and fixed

| # | What was weak | Where | Why it hurt | Change | Verified in r2 by |
|---|---|---|---|---|---|
| 1 | The camera panned off the terminal before the line visibly left it | 3.6–4.6 s | The key transformation (caret → line leaving the terminal) happened off-screen; 4.0–4.5 s was an almost empty frame | New camera beat: pull back and hold the terminal while the line draws out of the prompt (f200–258), then follow (f258–340); terminal fade moved later | snapshot at 4.0/4.4 s, r2 sheet |
| 2 | Dimmed Scene 2 labels overlapped the arriving lesson page | 8.0–8.6 s | Two layers of text on top of each other read as clutter | Other paths dim faster and are fully gone by f508, before the page is visible | r2 sheet 8.0–8.5 s |
| 3 | The thread crossed the site header nav label "المرجع" | 9–13 s | A line through UI text looks like a rendering bug | Header nav offset is measured at build time and nudged so the gutter falls between two nav items | r2 still at 12.0 s. **Correction:** this check missed it. The nudge moved the items the wrong way, and the line still crossed "المرجع" in r2–r5. The final inspection found it and r6 fixes it (see round-04 #6) |
| 4 | The "نسخ" copy button covered `def` in the hovered code block | 12.0–13.2 s | The hero code line was partly hidden | That block gets extra top padding so the hover button sits above the code | r2 still at 12.0 s |
| 5 | Stage-1 annotations stayed visible (dimmed) during the pan to the system | 16.5–18.0 s | Fragments of text at the frame edge | Stage 1 clears fully; only the connecting thread remains | r2 sheet 16.5–18.0 s |
| 6 | Map labels appeared over the still-visible system diagram | 18.8–19.3 s | Overlapping text during the pull-back | System fades 20 frames earlier; map nodes start 14 frames later | r2 sheet 19.0 s |
| 7 | Instant state changes (keystroke text, output line, caret) were scheduled exactly on frame boundaries | Scene 1 | Floating-point equality on `t = N/60` can push a change to frame N+1; keystroke picture-sync histogram spread −2…+3 | All `tl.set` state changes now land half a frame before their event frame (`at(f)`), so frame N always shows the new state; the sync metric was also improved (99.7th-percentile local change instead of a global mean that the camera push dominated) | r2 picture-sync histogram |
| 8 | CTA pill was heavier than "restrained" | 26–30 s | Competed with the wordmark | Smaller type and padding, softer shadow, URL separated by a hairline | r2 still at 28 s |

## Deferred (planned for later rounds)

- Low-frequency energy is dense from 9 s onward (kick + bass + drone) — round 4 (audio).
- Typing clicks are relatively loud against the quiet opening — round 4.
- Motion blur not yet applied — round 3 (engine sub-frame motion blur).
