#!/usr/bin/env python3
"""
The Code Fix — launch film soundtrack (fully procedural, no samples).

Reads timing/timeline.json (the SAME file the animation reads) and places
every sound at sample = frame * 800 (48 000 Hz / 60 fps). Writes
audio/score.wav (48 kHz, 16-bit, stereo, exactly 30.000 s = 1 440 000 frames)
plus audio/stems/{music,sfx}.wav and audio/cue-sheet.json for verification.

Run: python3 audio/build_audio.py
"""
import json
import os
import wave

import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TL = json.load(open(os.path.join(ROOT, "timing", "timeline.json")))

SR = TL["sampleRate"]                       # 48000
SPF = TL["samplesPerFrame"]                 # 800
N = TL["durationFrames"] * SPF              # 1 440 000 samples = 30.000 s
BEAT = 60.0 / TL["bpm"]                     # 0.6 s
rng = np.random.default_rng(1016)           # seeded: identical output every build

music = np.zeros((2, N))
sfx = np.zeros((2, N))
send = np.zeros((2, N))                      # reverb send
cues = []


def f2s(frame):
    return int(round(frame * SPF))


def note(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    n, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o - 4)) / 12)


def pan_gains(p):
    """equal-power pan, p in [-1, 1]"""
    a = (p + 1) * np.pi / 4
    return np.cos(a), np.sin(a)


def add(bus, sig, start, pan=0.0, rev=0.0):
    """mix a mono signal into a stereo bus at sample `start`"""
    if start >= N:
        return
    end = min(N, start + len(sig))
    s = sig[: end - start]
    l, r = pan_gains(pan)
    bus[0, start:end] += s * l
    bus[1, start:end] += s * r
    if rev:
        send[0, start:end] += s * l * rev
        send[1, start:end] += s * r * rev


def env_adsr(n, a, d, s, r, sustain_len):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = max(0, sustain_len - a - d)
    e = np.concatenate([
        np.linspace(0, 1, max(a, 1), endpoint=False),
        np.linspace(1, s, max(d, 1), endpoint=False),
        np.full(hold, s),
        np.linspace(s, 0, max(r, 1)),
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def lp(sig, fc, order=2):
    sos = butter(order, fc / (SR / 2), btype="low", output="sos")
    return sosfilt(sos, sig)


def hp(sig, fc, order=2):
    sos = butter(order, fc / (SR / 2), btype="high", output="sos")
    return sosfilt(sos, sig)


def bp(sig, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), hi / (SR / 2)], btype="band", output="sos")
    return sosfilt(sos, sig)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


# ----------------------------------------------------------------------------
# Instruments
# ----------------------------------------------------------------------------
def soft_wave(f, t, phase=0.0):
    w = 2 * np.pi * f * t + phase
    return np.sin(w) + 0.22 * np.sin(2 * w) + 0.08 * np.sin(3 * w)


def pad_note(f, dur, amp, attack=0.9, release=1.6):
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for det, ph in ((-0.0035, 0.0), (0.0, 1.3), (0.0041, 2.1)):
        vib = 1 + 0.0015 * np.sin(2 * np.pi * 0.21 * t + ph)
        sig += soft_wave(f * (1 + det) * vib, t, ph)
    sig /= 3
    e = env_adsr(n, attack, 0.4, 0.85, release, int(dur * SR))
    return lp(sig * e * amp, 2600)


def pluck(f, amp, decay=0.55):
    t = t_axis(decay * 3.2)
    e = np.exp(-t / decay) * (1 - np.exp(-t / 0.003))
    sig = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t / (decay * 0.35)) + 0.12 * np.sin(6 * np.pi * f * t) * np.exp(-t / (decay * 0.2))
    return sig * e * amp


def bell(f, amp, decay=1.6, index=2.2, ratio=3.5):
    t = t_axis(decay * 3.0)
    mod_env = np.exp(-t / (decay * 0.25))
    sig = np.sin(2 * np.pi * f * t + index * mod_env * np.sin(2 * np.pi * f * ratio * t))
    e = np.exp(-t / decay) * (1 - np.exp(-t / 0.002))
    return sig * e * amp


def kick(amp):
    t = t_axis(0.5)
    f = 54 + 70 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-t / 0.22)
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.003) * 0.08
    return (sig + click) * amp


def hat(amp, decay=0.03):
    t = t_axis(decay * 6)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t / decay) * amp


def bass_note(f, dur, amp):
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    e = env_adsr(n, 0.02, 0.25, 0.7, 0.3, int(dur * SR))
    return lp(sig * e * amp, 900)


def key_click(variant, amp, deep=False):
    """keyboard keystroke: a short band-limited click + a low 'thock' body"""
    t = t_axis(0.09)
    nz = rng.standard_normal(len(t))
    centre = [3200, 3600, 2900, 4100, 3400, 3800][variant % 6]
    click = bp(nz, centre * 0.6, min(centre * 1.6, 15000)) * np.exp(-t / 0.0022)
    body_f = (150 if deep else 210) + variant * 9
    body = np.sin(2 * np.pi * body_f * t) * np.exp(-t / (0.028 if deep else 0.018))
    rattle = bp(nz, 900, 1800) * np.exp(-t / 0.009) * 0.25
    return (click * 0.9 + body * 0.55 + rattle) * amp


def whoosh(dur, amp, f0=300, f1=4000, rise=True):
    t = t_axis(dur)
    nz = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    # time-varying bandpass approximated by crossfading 8 static bands
    bands = np.geomspace(f0, f1, 8)
    pos = t / dur if rise else 1 - t / dur
    for i, fc in enumerate(bands):
        w = np.clip(1 - np.abs(pos * 7 - i), 0, 1)
        out += bp(nz, fc * 0.7, min(fc * 1.4, 20000)) * w
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return out * e * amp


def glide(f0, f1, dur, amp):
    t = t_axis(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    e = np.sin(np.pi * t / dur) ** 2
    return np.sin(ph) * e * amp


def blip(f, amp, dur=0.06):
    t = t_axis(dur * 4)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / dur) * (1 - np.exp(-t / 0.0015)) * amp


# ----------------------------------------------------------------------------
# MUSIC — ~100 BPM, D major, grows scene by scene
# ----------------------------------------------------------------------------
B = lambda beat: int(round(beat * BEAT * SR))          # beat -> sample
chords = [
    (5, 8, ["D3", "A3", "E4", "F#4"]),                  # the program runs
    (8, 12, ["B2", "F#3", "A3", "C#4", "D4"]),          # explore
    (12, 15, ["G2", "D3", "F#3", "A3", "B3"]),
    (15, 19, ["D3", "F#3", "A3", "C#4", "E4"]),         # learn
    (19, 24, ["A2", "E3", "A3", "B3", "C#4"]),
    (24, 28, ["E2", "B2", "D3", "F#3", "G3"]),          # build
    (28, 32, ["G2", "D3", "F#3", "A3", "B3"]),
    (32, 36, ["B2", "F#3", "A3", "C#4", "D4"]),         # bigger picture
    (36, 40, ["G2", "D3", "F#3", "B3", "D4"]),
    (40, 43, ["A2", "D3", "E3", "A3", "B3"]),           # suspended, before the mark
    (43, 51, ["D3", "A3", "C#4", "E4", "F#4"]),         # resolve on the logo
]
bass_roots = {5: "D2", 8: "B1", 12: "G1", 15: "D2", 19: "A1", 24: "E2", 28: "G1", 32: "B1", 36: "G1", 40: "A1", 43: "D2"}

# atmosphere: barely-there air + a low D drone from the first second
t = np.arange(N) / SR
air = lp(hp(rng.standard_normal(N), 300), 6000) * 0.0045
air *= np.clip(t / 2.0, 0, 1) * np.clip((30 - t) / 2.5, 0, 1)
music[0] += air
music[1] += np.roll(air, 37)
drone = (0.6 * np.sin(2 * np.pi * note("D2") * t) + 0.45 * np.sin(2 * np.pi * note("D3") * t)) * 0.010
drone *= np.clip((t - 0.4) / 2.6, 0, 1) * np.clip((30 - t) / 3.0, 0, 1)
music += drone

for b0, b1, names in chords:
    dur = (b1 - b0) * BEAT
    section_gain = 0.024 if b0 < 15 else 0.031 if b0 < 32 else 0.041
    if b0 >= 43:
        section_gain = 0.050
    for i, nm in enumerate(names):
        sig = pad_note(note(nm), dur + 0.15, section_gain, attack=0.7 if b0 != 5 else 0.35, release=2.2 if b0 >= 43 else 1.4)
        add(music, sig, B(b0), pan=(i / max(1, len(names) - 1) - 0.5) * 0.7, rev=0.35)

# bass enters with Learn, grows into the bigger picture
for b0, root in bass_roots.items():
    if b0 < 15:
        continue
    nxt = min([b for b in bass_roots if b > b0] + [50])
    gain = 0.034 if b0 < 32 else 0.046
    if b0 >= 43:
        gain = 0.05
    add(music, bass_note(note(root), (nxt - b0) * BEAT - 0.05, gain), B(b0))

# soft pulse: plucked chord tones on eighths from Explore onwards
for b0, b1, names in chords:
    if b0 < 8 or b0 >= 43:
        continue
    arp_gain = 0.018 if b0 < 15 else 0.022 if b0 < 24 else 0.027
    step = 0.5 if b0 < 24 else 0.25                    # eighths, then sixteenths in Build
    k = 0
    beat = b0
    while beat < b1 - 1e-9:
        nm = names[[1, 2, 3, 2, 4, 3, 2, 1][k % 8] % len(names)]
        f = note(nm) * 2
        add(music, pluck(f, arp_gain * (1.0 if k % 2 == 0 else 0.7), decay=0.22), B(beat), pan=0.25 * np.sin(k * 0.9), rev=0.25)
        beat += step
        k += 1

# kick + hats from Learn, steady and quiet; fuller in the bigger picture
for beat in range(15, 43):
    g = 0.075 if beat < 32 else 0.095
    if beat in (15, 24, 32) or beat % 2 == 1:
        add(music, kick(g), B(beat))
    if beat >= 24:
        add(music, hat(0.012 if beat < 32 else 0.016), B(beat + 0.5), pan=0.2)
        if beat >= 32:
            add(music, hat(0.008), B(beat + 0.25), pan=-0.25)
            add(music, hat(0.008), B(beat + 0.75), pan=-0.25)

# ----------------------------------------------------------------------------
# SFX — each one at its event frame
# ----------------------------------------------------------------------------
penta = [note(n) for n in ("A4", "B4", "D5", "E5", "F#5")]
tick_notes = [note(n) for n in ("D6", "E6", "F#6", "A6", "B6", "D7")]
connect_notes = [note(n) for n in ("D5", "F#5", "A5", "D6")]
hop_notes = [note(n) for n in ("A5", "B5", "D6", "E6")]
road_notes = [note(n) for n in ("D5", "E5", "F#5", "A5")]

for e in TL["events"]:
    kind, s0 = e.get("sfx"), f2s(e["frame"])
    if not kind:
        continue
    cues.append({"id": e["id"], "frame": e["frame"], "sample": s0, "seconds": round(s0 / SR, 6), "sfx": kind})
    if kind == "key":
        add(sfx, key_click(e.get("variant", 0), 0.24), s0, pan=e.get("pan", 0.0), rev=0.07)
    elif kind == "key_space":
        add(sfx, key_click(e.get("variant", 0), 0.24, deep=True), s0, pan=e.get("pan", 0.0), rev=0.07)
    elif kind == "enter":
        add(sfx, key_click(2, 0.42, deep=True), s0, rev=0.10)
        add(sfx, bell(note("A5"), 0.035, decay=1.2), s0 + 120, pan=0.1, rev=0.5)
    elif kind == "line_start":
        add(sfx, glide(320, 980, 0.9, 0.028), s0, rev=0.4)
        add(sfx, whoosh(1.1, 0.05, 400, 6000), s0, rev=0.3)
    elif kind == "branch":
        f = penta[e.get("note", 0) % 5]
        add(sfx, pluck(f, 0.075, decay=0.7), s0, pan=-0.4 + 0.2 * e.get("note", 0), rev=0.45)
        add(sfx, blip(f * 2, 0.012, 0.05), s0, rev=0.2)
    elif kind == "page_in":
        add(sfx, whoosh(1.2, 0.035, 200, 3000), s0, rev=0.3)
    elif kind == "tick":
        add(sfx, blip(tick_notes[e.get("note", 0) % 6], 0.030, 0.045), s0, pan=0.35, rev=0.3)
    elif kind == "select":
        add(sfx, bell(note("D6"), 0.040, decay=0.9, index=1.2), s0, pan=0.3, rev=0.4)
        add(sfx, bell(note("A6"), 0.025, decay=0.8, index=1.0), s0 + int(0.06 * SR), pan=0.3, rev=0.4)
    elif kind in ("section", "section_soft"):
        g = 0.030 if kind == "section" else 0.020
        add(sfx, blip(note("A5"), g, 0.05), s0, pan=-0.1, rev=0.25)
        add(sfx, hp(rng.standard_normal(int(0.04 * SR)), 4000) * np.exp(-np.arange(int(0.04 * SR)) / SR / 0.008) * 0.01, s0)
    elif kind == "ui_click":
        add(sfx, key_click(4, 0.16), s0, pan=-0.2, rev=0.1)
        add(sfx, blip(note("E6"), 0.018, 0.035), s0, pan=-0.2, rev=0.2)
    elif kind == "lift":
        add(sfx, whoosh(1.0, 0.060, 250, 5000), s0, rev=0.35)
        add(sfx, glide(140, 420, 0.9, 0.035), s0, rev=0.3)
    elif kind == "land":
        add(sfx, kick(0.10), s0, rev=0.2)
    elif kind == "connect":
        add(sfx, pluck(connect_notes[e.get("note", 0) % 4], 0.060, decay=0.5), s0, pan=0.3, rev=0.4)
    elif kind == "result":
        add(sfx, bell(note("D6"), 0.050, decay=1.4), s0, pan=0.3, rev=0.5)
    elif kind == "system":
        add(sfx, whoosh(0.9, 0.030, 300, 3500), s0, rev=0.3)
    elif kind == "hop":
        add(sfx, blip(hop_notes[e.get("note", 0) % 4], 0.032, 0.05), s0, pan=-0.3 + 0.2 * e.get("note", 0), rev=0.3)
    elif kind == "ok":
        add(sfx, bell(note("D6"), 0.040, decay=1.0, index=1.4), s0, rev=0.45)
        add(sfx, bell(note("A6"), 0.030, decay=1.0, index=1.2), s0 + int(0.08 * SR), rev=0.45)
    elif kind == "swell":
        add(sfx, whoosh(2.2, 0.040, 150, 2500), s0, rev=0.5)
    elif kind == "node":
        add(sfx, pluck(road_notes[e.get("note", 0) % 4], 0.070, decay=0.6), s0, pan=-0.3 + 0.2 * e.get("note", 0), rev=0.45)
    elif kind == "data":
        add(sfx, blip(note("E6"), 0.020, 0.04), s0, rev=0.2)
    elif kind == "riser":
        dur = (TL["marks"]["LOGO_HIT"] - e["frame"]) / TL["fps"]
        tt = t_axis(dur)
        r = whoosh(dur, 0.055, 200, 9000) * (tt / dur) ** 1.6
        r += glide(110, 440, dur, 0.03) * (tt / dur) ** 2 / np.maximum(np.sin(np.pi * tt / dur) ** 2, 0.05)
        add(sfx, r * np.clip((dur - tt) / 0.03, 0, 1), s0, rev=0.4)
    elif kind == "logo_hit":
        tt = t_axis(2.4)
        boom = np.sin(2 * np.pi * 48 * tt) * np.exp(-tt / 0.45) * 0.12
        add(sfx, boom, s0)
        add(sfx, kick(0.16), s0)
        for i, nm in enumerate(("D5", "F#5", "A5", "D6", "E6")):
            add(sfx, bell(note(nm), 0.030, decay=2.4, index=1.6), s0 + i * 90, pan=(i - 2) * 0.25, rev=0.6)
    elif kind == "wordmark":
        for i, nm in enumerate(("A6", "D7", "F#7")):
            add(sfx, bell(note(nm), 0.010, decay=1.0, index=0.8), s0 + int(i * 0.07 * SR), pan=0.3 - i * 0.3, rev=0.6)
    elif kind == "cta":
        add(sfx, key_click(3, 0.10), s0, rev=0.15)
        add(sfx, blip(note("D6"), 0.016, 0.06), s0, rev=0.35)

# ----------------------------------------------------------------------------
# Reverb (synthetic stereo IR), mix, loudness, limiter
# ----------------------------------------------------------------------------
def make_ir(seconds=2.6, predelay=0.022):
    n = int(seconds * SR)
    tt = np.arange(n) / SR
    ir = np.zeros((2, n + int(predelay * SR)))
    for ch in range(2):
        nz = rng.standard_normal(n) * np.exp(-tt / (seconds / 6.9))
        nz = lp(nz, 7000 - 2500 * ch * 0.2)
        ir[ch, int(predelay * SR):] = nz
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


ir = make_ir()
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)]) * 0.55

mix = music + sfx + wet
# gentle master high-pass + tilt
mix = np.stack([hp(mix[c], 34) for c in range(2)])

# end cleanly: the film's final half second fades to silence
fade = np.ones(N)
fl = int(1.4 * SR)
fade[-fl:] = np.cos(np.linspace(0, np.pi / 2, fl)) ** 2
mix *= fade

# loudness normalisation toward about -16 LUFS (BS.1770-style K-weighting)
def k_weight(x):
    """ITU-R BS.1770 K-weighting at 48 kHz (pre-filter shelf + RLB high-pass)"""
    from scipy.signal import lfilter
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x)
    return lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], y)


def lufs(x):
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    kw = np.stack([k_weight(x[c]) for c in range(2)])
    pw = []
    for s in range(0, N - blk, hop):
        pw.append(np.mean(kw[:, s:s + blk] ** 2, axis=1).sum())
    pw = np.array(pw)
    l = -0.691 + 10 * np.log10(pw + 1e-12)
    gated = pw[l > -70]
    rel = -0.691 + 10 * np.log10(np.mean(gated)) - 10
    gated = pw[(l > -70) & (l > rel)]
    return -0.691 + 10 * np.log10(np.mean(gated))


target = -16.0
mix *= 10 ** ((target - lufs(mix)) / 20)

# lookahead peak limiter at -1.5 dBFS (sample peak) with 4x oversampled check
ceiling = 10 ** (-1.5 / 20)
peak = np.max(np.abs(mix), axis=0)
look = int(0.004 * SR)
need = np.maximum(peak / ceiling, 1.0)
gain = 1 / need
# smooth gain: min over lookahead window then release
from scipy.ndimage import minimum_filter1d
g = minimum_filter1d(gain, size=2 * look + 1)
rel = np.exp(-1 / (0.08 * SR))
out = np.empty_like(g)
cur = 1.0
for i in range(N):
    cur = g[i] if g[i] < cur else cur * rel + g[i] * (1 - rel)
    out[i] = cur
mix *= out

os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x.T * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


write_wav(os.path.join(HERE, "score.wav"), mix)
write_wav(os.path.join(HERE, "stems", "music.wav"), music * 0.9)
write_wav(os.path.join(HERE, "stems", "sfx.wav"), sfx * 0.9)
json.dump({"sampleRate": SR, "samples": N, "seconds": N / SR, "cues": cues}, open(os.path.join(HERE, "cue-sheet.json"), "w"), indent=1)
print(f"score.wav: {N} samples ({N / SR:.3f}s), {len(cues)} cued sounds, integrated ~{lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.2f} dBFS")
