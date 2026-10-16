---
workflow: general-video
flow: automation
storyboard: no
message: "Every great builder starts with one line — The Code Fix turns that first line into understanding."
destination: youtube-embed
aspect: 1920x1080
language: en
audience: "Arabic-speaking learners and the wider tech community; English statements over the real Arabic product"
length: 30s
angle: brand-film
---

## Intent

A premium 30-second launch film for The Code Fix (thecodefix.net), the Arabic-first
technology education platform. One visual thread — a single violet line that starts as
the terminal caret of the platform's own first lesson — travels through every scene and
finally resolves into the real logo's check mark and circuit traces.

Emotional arc: curiosity → discovery → understanding → confidence → possibility.

## Assets

- assets/brand/icon.png — official logo (256px); the in-film mark is an SVG rebuilt from it and diff-verified.
- assets/brand/logo.png — official logo (500px, header usage).
- Real content pulled at build time from ../../src/content (tracks, lessons, roadmaps).

## Customizations

- Product UI is rebuilt in code (Python lesson 6 "الدوال (Functions)", dark theme, RTL), not screenshots.
- Original procedural soundtrack (~100 BPM) and SFX, generated from the same frame timeline as the animation.
- Final render uses HyperFrames' engine sub-frame motion blur (producer API `motionBlur`).

## Notes

- Never claim features that are not implemented. Verified live: 51 tracks, 1,233 lessons, roadmaps, free access.
- Palette is the site's own dark theme (single violet accent) plus the logo gradient for the resolve.
- Fonts are the site's own: Cairo (UI + statements) and JetBrains Mono (code/labels), OFL, bundled locally.
