# Quality review — Round 3

**Focus:** transitions, camera motion, depth, motion blur
**Render reviewed:** `renders/r3.mp4` (round-2 fixes, no motion blur)
**Revised render:** `renders/r4.mp4` (motion-blurred, see method below)

## Round-2 fixes confirmed in r3

| Fix | Evidence |
|---|---|
| Text jitter removed | Non-keystroke strong-change peak in the code line: 2,181 px (r2) → 132 px (r3); 0 frames above 600 px |
| Keystroke sync | 34 / 35 glyphs change exactly on their cue frame |
| Closer lesson framing, larger small labels, lower system row | r3 sheets 10–18 s |

## Weaknesses found and fixed

| # | What was weak | Where | Why it hurt | Change | Verified in r4 by |
|---|---|---|---|---|---|
| 1 | **No motion blur.** Fast camera moves (peak ≈ 35 px/frame in the terminal → paths move; the lift; the pull-back to the map; the dolly to the logo) strobed | 4.3–5.6 s, 13.3–14.4 s, 18.5–21 s, 24–26 s | Sharp, stepped motion reads as cheap compared with a camera shutter | **Temporal supersampling.** HyperFrames renders the composition at 240 fps twice — pass A at t = i/240, pass B shifted by 1/480 s through a composition variable (`subframeOffset`) — i.e. 480 real re-renders per second. `scripts/motion-blur.py` averages, in **linear light**, the five samples within ±1/240 s of each 60 fps frame with tent weights 1-2-3-2-1 (a centred 180° shutter). The centre sample is the 60 fps frame itself, so every event stays on its frame | blur crops at 4.75 s and 13.55 s; frame count / sync re-verified |
| 2 | First supersampled attempt used only pass A (3 samples): tiny high-contrast features (grid dots, thread nodes) showed 2–3 discrete copies at peak pan speed | 4.75 s, 13.55 s | Stepped ghosts are a classic low-sample artifact | Added pass B (5 samples per frame) | `cmp2_*.png` comparisons |
| 3 | First supersampled mux produced 1,797 frames / 29.95 s | `scripts/motion-blur.py` | ffmpeg `-shortest` cut the final frames | Explicit `-t 30` mux; the script always writes exactly 1,800 frames | `ffprobe -count_frames`: 1,800 / 30.000 s |
| 4 | No depth cues beyond perspective | 8.0–8.6, 13.3–14.2, 18.6–19.4, 24.0–25.0 s | Planes at different depths were equally sharp, so focus didn't guide attention | **Focus pulls that follow the story:** dimmed disciplines defocus (5 px) as the camera commits to Programming; the lesson page racks out (9 px) as its code lifts toward camera; the system defocuses (6 px) as the map arrives; map nodes defocus (6 px) as they converge into the mark | `assets/dof-*` snapshots |
| 5 | Lesson page's right edge (sidebar title) cropped by a few px after the closer framing | 11–13 s | A clipped UI edge looks accidental | Both Scene-3 framings end ≤ 1,880 px | r4 12.0 s still |

## Engine motion blur — tried, measured, documented

HyperFrames' engine supports real sub-frame motion blur (`motionBlur` render option). The CLI does
not expose it, so `scripts/render-final.mjs` drives the same `@hyperframes/producer` pipeline with
`motionBlur: { samplesPerFrame: 8, shutterAngle: 180, shutterPhase: -90, blend: "linear" }`.
On this machine (2 CPU cores, software GPU) that path forces screenshot capture and ran at
**0.33 output frames/s** (≈ 1.5–2.5 h per render). The 240 fps two-pass route produces 480 true
sub-frame samples per second through the fast BeginFrame path in ≈ 32 min. Both are genuine temporal
supersampling; the script for the engine route is kept for machines with a GPU.

## Camera continuity review (r3/r4)

Every scene keeps a motivated move: push-in on the first line → pull-back as the line leaves →
follow into the paths → settle/drift → follow the chosen path into the page → slow drift across the
lesson → lift and travel with the code → pan to the system → dolly out to the map → dolly into the
mark → final slow push. No hard cuts; no frame without camera or object motion.
