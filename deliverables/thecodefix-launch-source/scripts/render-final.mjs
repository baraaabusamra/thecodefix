#!/usr/bin/env node
// =====================================================================
// Final render with real sub-frame motion blur.
//
// The HyperFrames CLI does not expose the engine's `motionBlur` option, so
// this script drives the same @hyperframes/producer pipeline the CLI uses
// (createRenderRequest -> renderConfigFromRequest -> createRenderJob ->
// executeRenderJob) and adds `motionBlur`: for every output frame the engine
// seeks the timeline to N sub-frame instants inside a 180° shutter centred
// on the frame time, captures each, and averages them (temporal
// supersampling). Static frames are detected and skipped by the engine.
//
// Usage:
//   HF_TOOLS_DIR=/path/with/node_modules CHROME=/path/to/chrome \
//     node scripts/render-final.mjs <out.mp4> [samplesPerFrame=8]
// =====================================================================
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");
const out = resolve(process.argv[2] || resolve(PROJECT, "..", "renders", "final.mp4"));
const samples = Number(process.argv[3] || 8);

// @hyperframes/producer is ESM-only (exports.import), so resolve its entry file directly.
const base = process.env.HF_TOOLS_DIR || PROJECT;
const producer = await import(pathToFileURL(resolve(base, "node_modules", "@hyperframes", "producer", "dist", "index.js")).href);

const engineConfig = producer.resolveConfig({
  browserGpuMode: "software",
  ...(process.env.CHROME ? { chromePath: process.env.CHROME } : {}),
});
const request = producer.createRenderRequest({
  projectDir: PROJECT,
  outputPath: out,
  engineConfig,
  options: {
    fps: { num: 60, den: 1 },
    quality: "high",
    format: "mp4",
    workers: Number(process.env.WORKERS || 2),
    strictness: "best-effort",
  },
});
const config = producer.renderConfigFromRequest(request, { logger: producer.createConsoleLogger("info") });
config.motionBlur = { samplesPerFrame: samples, shutterAngle: 180, shutterPhase: -90, blend: "linear" };

const job = producer.createRenderJob(config);
let last = -1;
const t0 = Date.now();
await producer.executeRenderJob(job, PROJECT, out, (j, msg) => {
  const p = Math.floor(j.progress || 0);
  if (p !== last) { last = p; process.stdout.write(`\r${p}%  ${msg || ""}`.padEnd(80)); }
});
console.log(`\nfinished ${out} in ${((Date.now() - t0) / 60000).toFixed(1)} min — outcome: ${job.outcome}`);
if (job.warnings && job.warnings.length) for (const w of job.warnings) console.warn(`[${w.code}] ${w.message}`);
