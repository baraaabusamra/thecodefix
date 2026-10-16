# Quality review — Round 4

**Focus:** audio synchronisation, sound design, colour consistency, rendering quality, final brand presentation
**Render reviewed:** `renders/r4.mp4` (motion-blurred, two-pass temporal supersampling)
**Revised render:** `renders/r5.mp4`, then a final inspection pass on r5 → `renders/r6.mp4`, delivered as `thecodefix-launch.mp4`

## Round-3 fixes confirmed in r4

| Fix | Evidence |
|---|---|
| Motion blur present, events still frame-exact | 1,800 frames / 30.000 s; keystroke picture sync 34 / 35 exact after blurring (the centred tent keeps each frame's own instant as the dominant sample) |
| 5-sample shutter removes doubled rings | `renders/cmp2_13.55.png`: thread nodes smear into continuous streaks |
| Focus pulls | 8.1 s, 13.6 s, 19.0 s, 24.4 s |

## Audio — method

I cannot hear; the soundtrack is reviewed objectively: spectrogram and waveform
(`assets/score-*-r1.png` vs `assets/score-*-r4.png`), BS.1770 loudness (FFmpeg `ebur128`),
per-section RMS, spectral energy split (Welch PSD, 9–25 s), and per-cue onset timing measured in the
**decoded MP4** against the shared timeline. Musical taste should be confirmed by a human listener.

## Weaknesses found and fixed

| # | What was weak | Where | Why it hurt | Change | Verified by |
|---|---|---|---|---|---|
| 1 | Low end too dense: 51.5 % of energy below 100 Hz, 12.2 % below 50 Hz | 9–30 s | "Carefully controlled low-frequency energy" was not met; would mask the plucks and bells on laptop speakers and pump the limiter | Bass −3.3 dB, kick −3.3 dB with its pitch floor raised 46 → 54 Hz, drone rebalanced toward D3, master high-pass 28 → 34 Hz, logo thump shorter (0.6 → 0.45 s) | <100 Hz **34.0 %**, <50 Hz **3.2 %** |
| 2 | Keystrokes almost as loud as the later music | 0.5–2.7 s | The opening is meant to be hushed; clicks dominated | Keystrokes −1.9 dB with a little more room | waveform r4 vs r1 |
| 3 | Weak dynamic arc (sections within ~5 dB, flat after 9 s) | whole film | The music should *develop*: curiosity → possibility | Pads/arps re-staged per scene: section RMS now −21.7 → −20.3 → −19.9 → −18.2 → −17.1 → **−15.3 (logo)** → −20.2 dB; LRA 4.7 → 5.5 LU | `build_audio.py` analysis |
| 4 | Ending: 0.6 s fade felt abrupt after the bell chord | 29.4–30.0 s | "Finish cleanly" | 1.4 s cosine fade; the last chord decays into it | waveform r4 |
| 5 | Peak pan speed in the terminal → paths move (~35 px/frame) still left short dotted streaks on 3 px grid dots | 4.4–5.2 s | Residual sampling artifact | Move lengthened by 12 frames (lower peak speed); grid dots softened (radial falloff to 3 px) | r5 crop at 4.75 s |

## Colour consistency

One accent (`#a78bfa` / `#7c5cff`) carries the line, statements' emphasis and highlights in every
scene. Other hues are the product's own UI colours and appear only inside UI: Python track blue
`#3776ab` (label, "التالي" button), completion green (sidebar ✓, `200 OK` chip), One-Dark syntax
colours in code. The logo gradient appears only when the mark forms. No additional accent colours.

## Brand presentation

- The mark is drawn from the line and matches the official icon: rendered frame at 28.0 s vs.
  `src/app/icon.png` — geometry IoU 0.94 (against a 1.5× upscale of the 256 px PNG), mean colour
  difference ≈10/255 on solid pixels (warm halo + 4:2:0 chroma) (`assets/logo-official-vs-render.png`).
- Lockup hierarchy: mark → "The Code Fix" (96 px) → "Learn. Build. Understand." (40 px) →
  "تعلّم البرمجة بالعربي" (the site's own headline, 32 px) → CTA "Explore The Code Fix | thecodefix.net".
- Hold: wordmark from 26.1 s, full lockup from 27.1 s to 30.0 s with a slow push (no freeze).
- No "available now" claim (the site is already live; the film makes no release-timing claim).

## Final inspection of r5 (full-resolution frames + 0.5 s contact sheets)

r5 passed every measurement, but looking at it frame by frame found three defects. Each was fixed, checked in
snapshots at the affected instants, and the film was rendered again (r6).

| # | What was weak | Where | Why it hurt | Change | Verified by |
|---|---|---|---|---|---|
| 6 | The vertical line cut through the header item **"المرجع"** | 9.0–13.5 s | Round 1 had added a header "nudge" so the line would fall between two nav items. Its sign was wrong for an RTL row: a smaller `margin-right` moves the items *right*, so the nudge moved "المرجع" onto the line rather than away from it. In the most legible shot of the film, the line looked like it crossed out a label | The nudge now picks the nearer item boundary and moves it onto the line in the correct direction (`margin-right` 12 → 34 px). The gutter now sits 11 site-px from "المرجع" and 11 px from "المسارات ▾" | DOM measurement of every nav item vs. the gutter; 4× crop of the 11.0 s snapshot (`assets/r6-nav-fix.png`) |
| 7 | Near-empty beat between *Build* and *The bigger picture* | ≈18.95–19.25 s | The system faded out (from frame 1108) before the map nodes started (frame 1142 or later). For about 0.3 s only one stray label was on screen, which broke the "one continuous world" idea | Cross-dissolve: the system fades from frame 1120 over 52 frames and defocuses. Map nodes start at frame 1130 and appear centre-out, and cluster labels come 12 frames earlier | Snapshots at 18.85 / 19.0 / 19.1 / 19.25 / 19.4 s (`assets/r6-dissolve.jpg`) |
| 8 | Track titles that start with a Latin word were laid out left-to-right: "SQL وقواعد البيانات", "Linux وسطر الأوامر", "Terraform والبنية التحتية كرمز", "DevOps و CI/CD", "PostgreSQL المتقدّم", and the edge labels "HTTP و HTTPS" / "SQL وقواعد البيانات" | map 19–25 s; system 16.6–19 s | `unicode-bidi: plaintext` takes the paragraph direction from the first letter, so an Arabic reader would meet the words in the wrong order. On thecodefix.net (an RTL page) these titles start from the right | Any label that contains Arabic now uses `direction: rtl; unicode-bidi: isolate`. Latin-only titles (C++, C#, Next.js…) stay LTR so their punctuation doesn't flip | Snapshots at 17.6 and 22.5 s |

## Final verification

The measurements taken on the final render (r6) are in `production-report.md` §6.
