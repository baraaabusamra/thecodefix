# Production report — The Code Fix launch film

**Deliverable:** `deliverables/thecodefix-launch.mp4` · 1920×1080 · 60 fps · 30.000 s · H.264 + AAC 48 kHz
**Source:** `deliverables/thecodefix-launch-source/` (HyperFrames 0.8.164 composition + procedural audio)
**Reviews:** `deliverables/quality-review/round-01.md` … `round-04.md` (+ `assets/`)

---

## 1. What was inspected before designing

| Source | Findings that shaped the film |
|---|---|
| Repository `baraaabusamra/thecodefix` (commit `8271d82`) | Next.js 16 / React 19 / TypeScript / Tailwind 4, Arabic-first RTL. Dark-theme tokens in `src/app/globals.css`: background `#0b0a0f`, surfaces `#121118` / `#1a1822`, border `#26242e`, text `#ececf1`, muted `#94909f`, **one violet accent** (`#a78bfa` text, `#7c5cff` brand, `#6d4aff` solid). Fonts: **Cairo** (UI) and **JetBrains Mono** (code). One-Dark-style code colours. |
| Logo | `src/app/icon.png` / `public/logo.png`: a check mark with four circuit traces ending in ring nodes, magenta→amber gradient. `public/thecodefix-seal.png` carries "Learn • Practice • Grow". |
| Live site thecodefix.net | Hero "تعلّم البرمجة بالعربي", badge "51+ مسار تعليمي — مجانًا بالكامل", per-track lesson counts summing to **1,233** — identical to the repo's 1,233 lesson files across **51** tracks. |
| Real content used | Python lesson 0's first program `print("مرحبًا بك في The Code Fix!")`; Python lesson 6 "الدوال (Functions)" (breadcrumb, meta row "الدرس 6 من 30 · 1 دقائق قراءة", last-updated 2026-06-19, both code examples and their Arabic explanations); the Python lesson list in its real order; the 51 real track titles; the 9 real roadmaps. |
| Implemented vs. not | **Shown (implemented):** tracks, lessons, lesson list with completion checkmarks, syntax-highlighted code with the copy button, roadmaps, free access. **Not claimed:** labs, mentoring, certifications, Pro subscription (Stripe wiring is dormant), instant search (planned). |
| HyperFrames | CLI 0.8.164 (`hyperframes` on npm). Local render = Puppeteer + FFmpeg, BeginFrame capture, GSAP runtime. Engine `motionBlur` exists in `@hyperframes/producer` but is not exposed by the CLI. Chrome headless shell could not be downloaded (host blocked), so the Chromium bundled in the `@sparticuz/chromium` npm package (153.0.8010.0) was used via `HYPERFRAMES_BROWSER_PATH`. |

## 2. Creative direction

**Idea:** *Every great builder starts with one line.* The film is one continuous camera move through
one world, carried by one violet line — the platform's own accent colour.

| Time | Scene | What the line is |
|---|---|---|
| 0.0–4.2 s | **The first line** — a quiet terminal; the first program of the platform's first Python lesson is typed and runs on the downbeat. *"Every great builder starts somewhere."* | the caret |
| 4.2–9.0 s | **Explore** — the caret flattens into a line that leaves the terminal and branches, PCB-style, into five disciplines labelled with real track names. *"Explore the technologies shaping tomorrow."* | the trunk and its branches (ring nodes echo the logo) |
| 9.0–14.4 s | **Learn** — the Programming path runs into the real lesson page (rebuilt in code, RTL); it descends between lesson list and content, ticking lessons 1–5 complete and opening lesson 6. Hovering the code reveals the site's real "نسخ" button. *"Turn complexity into understanding."* | the spine connecting lessons and sections |
| 14.4–19.2 s | **Build** — that lesson's own code lifts off the page; the line underlines its tokens and routes them to the lesson's own Arabic explanations, then becomes a request flowing through a client/server/database system (labelled with real lesson/track names). *"Understand more. Build with purpose."* | connectors, then the request path |
| 19.2–25.2 s | **The bigger picture** — the camera pulls back: every real track in eleven domains, linked by the real roadmaps; the line walks the "خبير الأمن السيبراني" roadmap. *"Your next breakthrough starts here."* · `51 TRACKS · 1,200+ LESSONS · FREE` | a learning path through the whole map |
| 25.2–30.0 s | **The Code Fix** — the map converges; the line traces the check mark and becomes it; the circuit traces grow to their ring nodes; wordmark, tagline, Arabic positioning line and a restrained CTA. | the logo |

**Visual identity:** the site's dark theme only; violet for the line and accents; the logo gradient
appears only when the mark forms. Cairo for statements and UI (Arabic + Latin), JetBrains Mono for
code and technical labels. Arabic UI is authentic RTL; English statements are the film's voice.

## 3. How it was built

- **Shared timeline** — `timing/build-timeline.mjs` defines every sound-bearing event in frames
  (35 keystrokes with a human rhythm, the Enter on beat 5, branch connections on the eighth-note
  grid, lesson ticks on sixteenths, logo hit on beat 43, …) and writes `timeline.json` (audio) and
  `timeline.generated.js` (picture). Picture uses `frame / 60` s; audio uses `frame × 800` samples.
  Instant state changes are scheduled half a frame early so frame N always shows them.
- **Composition** — `index.html` + `js/film.js`: a perspective camera rig (`#rig-r` rotation,
  `#rig-p` position) over a world-space scene graph; one paused GSAP timeline; camera keyframes are
  computed from world rectangles (`frame()`), so framings stay correct if layouts change.
  Real data (`js/data.generated.js`) is read from the app's `src/content` at build time.
- **Lesson page** — built from the real components' structure (header, RTL grid, sidebar, breadcrumbs,
  meta row, prev/next, prose, hljs colours, copy button) at 1.25× zoom; positions for the thread are
  measured from the laid-out DOM at build time (never during tweens).
- **Logo** — SVG reconstruction of `icon.png`: polyline check with round caps/joins (42 u), four traces
  with angle-cut ends, ring nodes, gradients fitted from pixel samples. Diff vs. the official icon:
  ≈1 % mean alpha error, ≈3/255 colour error (`quality-review/round-04.md`).
- **Sound** — `audio/build_audio.py`, numpy/scipy only: soft-wave pads (D major, 100 BPM), plucked
  arpeggios, a sine bass from *Learn*, soft kick/hats from *Learn*/*Build*, FM bells, keystroke
  clicks (band-limited noise + body thock, six variants, panned), whooshes, a riser into the logo,
  a sub-thump + bell chord on the logo hit; synthetic stereo convolution reverb; BS.1770 loudness
  normalisation to −16 LUFS; −1.5 dBFS limiter; 1.4 s cosine fade to silence. Seeded RNG → identical
  output on every build.
- **Motion blur** — temporal supersampling: two 240 fps HyperFrames passes (the second shifted by
  1/480 s via the `subframeOffset` composition variable) → `scripts/motion-blur.py` averages the five
  samples within ±1/240 s of every frame in linear light, tent-weighted (centred 180° shutter).
- **Depth** — perspective camera with tilts; layered planes (grid at z −260, lifting code card,
  receding page); story-driven focus pulls (5–9 px) at four transitions.

## 4. Critique rounds (summary)

| Round | Focus | Key findings → fixes |
|---|---|---|
| 1 | visual language, composition, narrative | line left the terminal off-screen → camera pulls back first; S2 labels over the page; thread crossing a nav label → header measured & nudged; copy button over code; stage-1 debris; map/system overlap; half-frame timing ambiguity → `at(f)`; heavy CTA |
| 2 | pacing, typography, readability | **text jitter** during camera moves (1 px hops every 4–6 frames, up to 2,181 px changed) → text layers rasterised once (`will-change: transform`), now ≤132 px; sync metric fixed (34/35 exact); closer opening and lesson framing; larger small labels |
| 3 | transitions, camera, depth, motion blur | added temporal-supersampled motion blur (3 → 5 samples after stepping was found); 1,797-frame mux bug fixed; four focus pulls; page crop fixed; engine `motionBlur` path measured at 0.33 fps on this machine and documented |
| 4 | audio sync, sound design, colour, render quality, brand | LF energy 51.5 % → 34 % (<100 Hz), sub-50 Hz 12.2 % → 3.2 %; quieter keystrokes; clearer dynamic arc; tighter logo thump; longer natural ending; slower peak pan; softer grid dots; logo verified against the official icon |
| 4b | final frame-by-frame inspection of r5 | the line cut through the nav item "المرجع" (wrong sign in the RTL nudge, a round-1 regression); a near-empty ~0.3 s beat at 19.1 s → cross-dissolve; Latin-first Arabic titles laid out LTR → RTL like the site. Re-rendered as r6 |

## 5. Final quality-control results

_See section 6 — filled from the final render's own measurements._
