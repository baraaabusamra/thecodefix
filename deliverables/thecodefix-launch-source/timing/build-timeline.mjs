#!/usr/bin/env node
// =====================================================================
// TheCodeFix launch film — SHARED TIMELINE (single source of truth)
//
// Every animation event that has a sound is defined here, in FRAMES at
// 60 fps. This script writes:
//   timing/timeline.json        -> read by audio/build_audio.py
//   js/timeline.generated.js    -> read by js/film.js (window.TCF_TIMELINE)
//   js/data.generated.js        -> real product content (window.TCF_DATA)
//
// Audio converts frame N to sample N * 800 (48 000 Hz / 60 fps), and the
// animation converts frame N to N / 60 seconds, so both sides land on the
// same instant by construction.
//
// Run: node timing/build-timeline.mjs
// =====================================================================
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const REPO = join(ROOT, "..", "..");           // the TheCodeFix app repo
const CONTENT = join(REPO, "src", "content");

const FPS = 60;
const DURATION_FRAMES = 1800;                   // 30.000 s exactly
const BPM = 100;
const BEAT = (60 / BPM) * FPS;                  // 36 frames per beat
const EIGHTH = BEAT / 2;                        // 18
const SIXTEENTH = BEAT / 4;                     // 9

// Deterministic PRNG (mulberry32) — no Math.random anywhere in the film.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------
// Scene windows (frames). Musical downbeats sit on the transitions:
// 180 (beat 5), 288 (8), 540 (15), 864 (24), 1152 (32), 1548 (43).
// ---------------------------------------------------------------------
const scenes = [
  { id: "s1", name: "The First Line", start: 0, end: 252 },
  { id: "s2", name: "Explore", start: 252, end: 540 },
  { id: "s3", name: "Learn", start: 540, end: 864 },
  { id: "s4", name: "Build", start: 864, end: 1152 },
  { id: "s5", name: "The Bigger Picture", start: 1152, end: 1512 },
  { id: "s6", name: "The Code Fix", start: 1512, end: 1800 },
];

const events = [];
const ev = (id, frame, sfx = null, params = {}) => {
  events.push({ id, frame: Math.round(frame), sfx, ...params });
  return Math.round(frame);
};

// ---------------------------------------------------------------------
// SCENE 1 — typing the first line of TheCodeFix's own first Python lesson
// (src/content/tracks/python/00-intro.mdx, "أول برنامج").
// ---------------------------------------------------------------------
const FIRST_LINE = 'print("مرحبًا بك في The Code Fix!")';
// Each keystroke reveals the prefix up to `end` (UTF-16 index). The Arabic
// tanween (U+064B) is its own keystroke on an Arabic keyboard.
const keys = [];
{
  const r = rng(20261016);
  let f = 32;                                   // first keystroke
  const chars = Array.from(FIRST_LINE);
  let idx = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    idx += ch.length;
    const prev = chars[i - 1];
    // Human rhythm: base 3–4 frames, deliberate pauses where a person
    // would pause (opening bracket, keyboard-layout switches, spaces).
    let gap = 3 + (r() < 0.4 ? 1 : 0);
    if (prev === "(") gap += 1;
    if (prev === '"' && i === 7) gap += 4;      // switch to Arabic layout
    if (prev === " " && r() < 0.5) gap += 1;
    if (ch === "T") gap += 5;                   // switch back to Latin layout
    if (ch === "!") gap += 1;
    if (i === 0) gap = 0;
    f += gap;
    const kind = ch === " " ? "space" : "key";
    keys.push({ frame: f, end: idx, ch, kind });
    ev(`key_${i}`, f, kind === "space" ? "key_space" : "key", { variant: Math.floor(r() * 6), pan: (r() - 0.5) * 0.3 });
  }
}
const lastKey = keys[keys.length - 1].frame;
const ENTER = ev("enter", 5 * BEAT, "enter");   // f180 — the program runs on the downbeat
const OUTPUT = ev("output", ENTER + 2);
const PROMPT3 = ev("prompt3", ENTER + 6);
const THREAD_START = ev("thread_start", 204, "line_start");
const TRUNK_END = ev("trunk_end", 8 * BEAT);    // f288 — thread reaches the split

// ---------------------------------------------------------------------
// SCENE 2 — branches connect on the eighth-note grid
// ---------------------------------------------------------------------
const branchOrder = ["prog", "cyber", "ai", "cloud", "systems"];
const branchConnect = {};
branchOrder.forEach((b, i) => {
  const f = TRUNK_END + 2 * EIGHTH + i * EIGHTH; // 324, 342, 360, 378, 396
  branchConnect[b] = ev(`branch_${b}`, f, "branch", { note: i });
});
const S2_TITLE_IN = ev("s2_title_in", 330);
const S2_DIM = ev("s2_dim", 462);

// ---------------------------------------------------------------------
// SCENE 3 — the chosen path becomes the Python course; lesson 6 opens
// ---------------------------------------------------------------------
const PAGE_IN = ev("page_in", 504, "page_in");
const sidebarDots = [];
for (let i = 0; i < 6; i++) sidebarDots.push(ev(`lesson_${i + 1}`, 15 * BEAT + 9 + i * SIXTEENTH, "tick", { note: i })); // 549..594
const ACTIVE = ev("lesson_active", 15 * BEAT + 3 * EIGHTH + 9, "select"); // 603
const SECTIONS = [ev("sec_h1", 621, "section"), ev("sec_meta", 639, "section_soft"), ev("sec_code", 666, "section")];
const CODE_FOCUS = ev("code_focus", 720, "ui_click");
const S3_TITLE_IN = ev("s3_title_in", 612);
const LIFT = ev("lift", 798, "lift");

// ---------------------------------------------------------------------
// SCENE 4 — the lesson's own code decomposes into concepts, then a system
// ---------------------------------------------------------------------
const CARD_LAND = ev("card_land", 24 * BEAT, "land");                 // 864
const concepts = ["params", "body", "call", "result"].map((c, i) => ev(`concept_${c}`, 24 * BEAT + 18 + i * EIGHTH, "connect", { note: i })); // 882..936
const RESULT = ev("result_10", 24 * BEAT + 5 * EIGHTH + 9, "result");  // 963
const SYS_IN = ev("system_in", 27 * BEAT + 6, "system");                // 978
const hops = [0, 1, 2, 3].map((i) => ev(`hop_${i}`, 28 * BEAT + i * EIGHTH, "hop", { note: i })); // 1008..1062
const OK200 = ev("ok_200", 30 * BEAT, "ok");                            // 1080
const S4_TITLE_IN = ev("s4_title_in", 900);

// ---------------------------------------------------------------------
// SCENE 5 — the bigger picture: every real track, connected by real roadmaps
// ---------------------------------------------------------------------
const MAP_REVEAL = ev("map_reveal", 31 * BEAT + 12, "swell");          // 1128
const roadmapNodes = [0, 1, 2, 3].map((i) => ev(`road_${i}`, 35 * BEAT + i * EIGHTH, "node", { note: i })); // 1260..1314
const DATA_IN = ev("data_in", 37 * BEAT, "data");                        // 1332
const S5_TITLE_IN = ev("s5_title_in", 1290);
const CONVERGE = ev("converge", 40 * BEAT, "riser");                     // 1440

// ---------------------------------------------------------------------
// SCENE 6 — the line resolves into the real mark
// ---------------------------------------------------------------------
const CHECK_START = ev("check_start", 42 * BEAT);                        // 1512
const LOGO_HIT = ev("logo_hit", 43 * BEAT, "logo_hit");                  // 1548
const WORDMARK = ev("wordmark", 43 * BEAT + EIGHTH, "wordmark");         // 1566
const TAGLINE = ev("tagline", 44 * BEAT + 6);                            // 1590
const CTA = ev("cta", 45 * BEAT + 6, "cta");                             // 1626
const END = ev("end", DURATION_FRAMES);

events.sort((a, b) => a.frame - b.frame);

// ---------------------------------------------------------------------
// Real product data, read from the app's own content folder.
// ---------------------------------------------------------------------
function readJSON(p) { return JSON.parse(readFileSync(p, "utf8")); }
const tracks = {};
if (existsSync(join(CONTENT, "tracks"))) {
  for (const slug of readdirSync(join(CONTENT, "tracks"))) {
    const meta = join(CONTENT, "tracks", slug, "_meta.json");
    if (!existsSync(meta)) continue;
    const m = readJSON(meta);
    const lessons = readdirSync(join(CONTENT, "tracks", slug)).filter((f) => f.endsWith(".mdx")).length;
    tracks[slug] = { title: m.title, color: m.color, lessons, order: m.order ?? 999 };
  }
}
const roadmaps = {};
if (existsSync(join(CONTENT, "roadmaps"))) {
  for (const f of readdirSync(join(CONTENT, "roadmaps"))) {
    const r = readJSON(join(CONTENT, "roadmaps", f));
    roadmaps[f.replace(/\.json$/, "")] = { title: r.title, steps: r.steps.map((s) => s.track) };
  }
}
const pythonLessons = [];
{
  const dir = join(CONTENT, "tracks", "python");
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
      const src = readFileSync(join(dir, f), "utf8");
      const title = (src.match(/^title:\s*"(.*)"\s*$/m) || [])[1];
      const order = Number((src.match(/^order:\s*(\d+)/m) || [])[1]);
      pythonLessons.push({ slug: f.replace(/\.mdx$/, ""), title, order });
    }
    pythonLessons.sort((a, b) => a.order - b.order);
  }
}
const totalLessons = Object.values(tracks).reduce((n, t) => n + t.lessons, 0);

const timeline = {
  fps: FPS,
  durationFrames: DURATION_FRAMES,
  bpm: BPM,
  beatFrames: BEAT,
  sampleRate: 48000,
  samplesPerFrame: 48000 / FPS,
  scenes,
  firstLine: FIRST_LINE,
  keys,
  branchConnect,
  sidebarDots,
  concepts,
  hops,
  roadmapNodes,
  marks: {
    ENTER, OUTPUT, PROMPT3, THREAD_START, TRUNK_END, S2_TITLE_IN, S2_DIM,
    PAGE_IN, ACTIVE, SECTIONS, CODE_FOCUS, S3_TITLE_IN, LIFT,
    CARD_LAND, RESULT, SYS_IN, OK200, S4_TITLE_IN,
    MAP_REVEAL, DATA_IN, S5_TITLE_IN, CONVERGE,
    CHECK_START, LOGO_HIT, WORDMARK, TAGLINE, CTA, END, lastKey,
  },
  events,
};

const data = {
  tracks,
  roadmaps,
  pythonLessons,
  totals: { tracks: Object.keys(tracks).length, lessons: totalLessons },
};

writeFileSync(join(HERE, "timeline.json"), JSON.stringify(timeline, null, 2));
writeFileSync(join(ROOT, "js", "timeline.generated.js"),
  "// GENERATED by timing/build-timeline.mjs — do not edit.\nwindow.TCF_TIMELINE = " + JSON.stringify(timeline) + ";\n");
writeFileSync(join(ROOT, "js", "data.generated.js"),
  "// GENERATED by timing/build-timeline.mjs from ../../src/content — do not edit.\nwindow.TCF_DATA = " + JSON.stringify(data) + ";\n");

console.log(`timeline: ${events.length} events, last keystroke f${lastKey}, enter f${ENTER}`);
console.log(`data: ${data.totals.tracks} tracks, ${data.totals.lessons} lessons, ${Object.keys(roadmaps).length} roadmaps, ${pythonLessons.length} python lessons`);
