# Quality review — Round 2

**Focus:** pacing, typography, spacing, interface readability
**Render reviewed:** `renders/r2.mp4` (contains the round-1 fixes)
**Revised render:** `renders/r3.mp4`

## Round-1 fixes confirmed in r2

| Fix | Evidence |
|---|---|
| Line visibly leaves the terminal | 4.0 s and 4.5 s frames: the line is drawn out of the `>>>` prompt with the terminal still in frame |
| Scene 2 labels gone before the page | 8.5 s frame: no residual labels over the page |
| Copy button no longer covers `def` | 12.0 s still |
| Stage-1 debris removed during the pan | 16.5–17.5 s frames |
| Map labels no longer collide with the system diagram | 19.0 s frame |

## Method

Same objective checks as round 1 (decoded frame count, duration, codec, loudness, cross-correlation
offset, cue onsets, 60 frames at 0.5 s), plus two new measurements written into `scripts/verify.py`:

- **Keystroke picture sync** — for every keystroke, the number of strongly changed pixels in the code
  line on the cue frame vs the neighbouring frames.
- **Text stability** — strongly changed pixels in the code line on frames *without* a keystroke,
  during the slow camera push (frames 100–170).

## Weaknesses found and fixed

| # | What was weak | Where | Why it hurt | Change | Verified in r3 by |
|---|---|---|---|---|---|
| 1 | **Text jitter during camera moves.** Text hopped ~1 px every 4–6 frames while the camera pushed in (non-keystroke frames with up to 2,181 strongly changed px in the code line) | Every scene with a moving camera; measured in Scene 1 | Glyph positions snap to whole device pixels at device-scale 1, so slow zooms make letters crawl; very visible when a viewer watches the typed line | Every text-bearing element that moves under the camera is rasterised once as its own layer (`will-change: transform`), so the camera move becomes a sub-pixel transform of that layer. Sharpness re-measured (Laplacian variance) at 3.2 s, 12.0 s, 22.9 s, 27.5 s: unchanged within ±4 % | r3: max non-keystroke change **132 px** (was 2,181); 0 frames above 600 px (was 4) |
| 2 | Keystroke sync metric gave a scattered histogram | `scripts/verify.py` | The ±3-frame window included the next keystroke (keys are 3–4 frames apart), hiding the real result | Metric now compares the cue frame against the frames just before it and the one after | r3: **34 / 35** glyph changes land exactly on their cue frame; the remaining one is the Arabic tanween diacritic, too small to detect |
| 3 | The opening terminal felt small and distant for the first second | 0.0–1.0 s | The first line is the hero; at 0.89× it read as a thumbnail | Start closer (camera z 210 instead of 300); the push-in still ends at the same framing | r3 sheet 0.0–1.0 s |
| 4 | Lesson UI text (sidebar 14 px, code 15 px at site scale) was small on screen | 9.5–13.0 s | "Readable when paused" was borderline for the lesson list | Camera frames the page ~8 % closer in both Scene-3 framings | r3 still at 12.0 s |
| 5 | System row sat high with an empty lower half | 16.8–18.5 s | Unbalanced composition against the bottom-left statement | System framed 62 px lower | r3 sheet 17.0–18.0 s |
| 6 | Small monospace labels (annotation keys 15 px, node keys 14 px, card tag 15 px, edge labels 22 px) | Scene 4 | Below comfortable reading size at 1080p | Raised to 17 / 16 / 17 / 24 px | r3 sheet 15.0–18.0 s |

## Pacing check (unchanged, acceptable)

| Statement | On screen (r3) | Words | Reading time needed (~4 words/s + 0.5 s) |
|---|---|---|---|
| Every great builder starts somewhere. | 3.2 → 5.2 s (2.0 s) | 5 | 1.8 s |
| Explore the technologies shaping tomorrow. | 5.6 → 8.4 s (2.8 s) | 5 | 1.8 s |
| Turn complexity into understanding. | 10.3 → 13.2 s (2.9 s) | 4 | 1.5 s |
| Understand more. Build with purpose. | 15.1 → 18.6 s (3.5 s) | 5 | 1.8 s |
| Your next breakthrough starts here. | 21.6 → 24.2 s (2.6 s) | 5 | 1.8 s |
| Lockup (wordmark, tagline, CTA) | 26.1 → 30.0 s (3.9 s) | — | — |

## Remaining for round 3

- The page's right edge (sidebar title) is cropped by a few pixels at 12.0 s after the closer framing.
- No depth-of-field yet; no motion blur yet.
