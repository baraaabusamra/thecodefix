#!/usr/bin/env python3
"""
Verify a rendered film against the delivery spec, using the rendered media
itself (never the config):

  * container/codec/resolution/fps/pixel format          (ffprobe)
  * exact decoded frame count and presentation duration   (ffprobe -count_frames)
  * audio presence, sample rate, duration, loudness        (ffprobe + ebur128)
  * audio offset vs the source score (cross-correlation)  -> encoder delay check
  * per-cue sync: audio onset near each cue + picture change at keystroke frames
  * frames every 0.5 s -> PNGs + contact sheets for review

Usage: python3 scripts/verify.py <video.mp4> <out_dir>
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout


def probe(path):
    js = json.loads(run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", path]))
    v = next(s for s in js["streams"] if s["codec_type"] == "video")
    a = next((s for s in js["streams"] if s["codec_type"] == "audio"), None)
    return js, v, a


def read_wav(path):
    with wave.open(path) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype="<i2").reshape(-1, ch).astype(np.float64) / 32768
    return sr, x


def decode_audio(path, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", out], check=True)
    return read_wav(out)


def onset_env(x, sr, hop=240):
    """high-frequency energy flux — clicks and attacks show up sharply"""
    from scipy.signal import butter, sosfilt
    sos = butter(2, 1500 / (sr / 2), btype="high", output="sos")
    y = sosfilt(sos, x.mean(axis=1))
    frames = len(y) // hop
    e = np.sqrt(np.mean(y[: frames * hop].reshape(frames, hop) ** 2, axis=1))
    flux = np.maximum(np.diff(e, prepend=e[0]), 0)
    return flux, hop


def main():
    video, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    report = {"file": os.path.abspath(video)}
    js, v, a = probe(video)
    num, den = map(int, v["avg_frame_rate"].split("/"))
    report["video"] = {
        "codec": v["codec_name"], "profile": v.get("profile"), "pix_fmt": v.get("pix_fmt"),
        "width": v["width"], "height": v["height"], "fps": num / den,
        "frames_decoded": int(v.get("nb_read_frames", 0)),
        "duration_s": float(v.get("duration", 0)),
    }
    report["format"] = {"container": js["format"]["format_name"], "duration_s": float(js["format"]["duration"]), "size_bytes": int(js["format"]["size"])}
    if a:
        report["audio"] = {"codec": a["codec_name"], "sample_rate": int(a["sample_rate"]), "channels": a["channels"], "duration_s": float(a.get("duration", 0))}
        loud = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        summ = loud[loud.rfind("Summary"):]
        def grab(key):
            for line in summ.splitlines():
                if line.strip().startswith(key):
                    return float(line.split(":")[1].split()[0])
        report["audio"]["integrated_lufs"] = grab("I:")
        report["audio"]["true_peak_dbfs"] = grab("Peak:")

        # offset against the source score (cross-correlation of the first 12 s)
        sr, dec = decode_audio(video, os.path.join(out, "decoded.wav"))
        _, src = read_wav(os.path.join(ROOT, "audio", "score.wav"))
        L = min(len(dec), len(src), sr * 12)
        from scipy.signal import fftconvolve
        d, s = dec[:L].mean(axis=1), src[:L].mean(axis=1)
        cc = fftconvolve(d, s[::-1], mode="full")
        lag = int(np.argmax(cc)) - (L - 1)
        report["audio"]["offset_vs_score_samples"] = lag
        report["audio"]["offset_vs_score_ms"] = round(lag / sr * 1000, 3)
        report["audio"]["decoded_samples"] = len(dec)
        corr = float(np.corrcoef(d[max(0, lag): L + min(0, lag)], s[max(0, -lag): L - max(0, lag)][: L - abs(lag)])[0, 1]) if abs(lag) < L else 0.0
        report["audio"]["correlation_with_score"] = round(corr, 4)

        # per-cue onset check: strongest onset within ±40 ms of each cue (decoded file)
        tl = json.load(open(os.path.join(ROOT, "timing", "timeline.json")))
        flux, hop = onset_env(dec, sr)
        res = []
        for e in tl["events"]:
            if not e.get("sfx") or e["sfx"] in ("riser", "swell"):
                continue
            c = e["frame"] * tl["samplesPerFrame"] / hop
            lo, hi = int(c - 0.040 * sr / hop), int(c + 0.040 * sr / hop) + 1
            win = flux[max(0, lo): hi]
            if len(win) == 0:
                continue
            k = int(np.argmax(win)) + max(0, lo)
            res.append({"id": e["id"], "frame": e["frame"], "onset_ms_from_cue": round((k - c) * hop / sr * 1000, 2)})
        errs = np.array([r["onset_ms_from_cue"] for r in res])
        report["audio"]["cue_onsets"] = {"count": len(res), "median_ms": float(np.median(errs)), "p95_abs_ms": float(np.percentile(np.abs(errs), 95)), "within_one_frame": int(np.sum(np.abs(errs) <= 1000 / 60 + 5))}
        json.dump(res, open(os.path.join(out, "cue-onsets.json"), "w"), indent=1)

    # picture side of the sync: each keystroke must change the terminal line on exactly its frame
    tl = json.load(open(os.path.join(ROOT, "timing", "timeline.json")))
    keyframes = [k["frame"] for k in tl["keys"]]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", "crop=1400:120:260:420,format=gray", "-frames:v", "200", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 120, 1400).astype(np.float32)
    # pixels that change strongly between consecutive frames: a new glyph is a burst of them,
    # the slow camera push almost none. cnt[i] = change from frame i to i+1.
    cnt = (np.abs(np.diff(fr, axis=0)) > 40).reshape(len(fr) - 1, -1).sum(axis=1)
    exact, detail = 0, []
    for k in tl["keys"]:
        f = k["frame"]
        at_cue = int(cnt[f - 1])                                   # change that first shows on frame f
        neighbours = [int(cnt[i]) for i in (f - 3, f - 2, f) if 0 <= i < len(cnt)]
        ok = at_cue >= 60 and at_cue > max(neighbours)
        exact += ok
        detail.append({"frame": f, "char": k["ch"], "changed_px_on_cue_frame": at_cue, "max_neighbour_px": max(neighbours), "exact": bool(ok)})
    json.dump(detail, open(os.path.join(out, "keystroke-picture-sync.json"), "w"), ensure_ascii=False, indent=1)
    report["picture_sync"] = {"keystrokes_checked": len(detail), "glyph_change_exactly_on_cue_frame": exact,
                              "not_detected": [d["char"] for d in detail if not d["exact"]]}

    # frames every 0.5 s + contact sheets
    fdir = os.path.join(out, "frames")
    os.makedirs(fdir, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", "fps=2", os.path.join(fdir, "f_%03d.png")], check=True)
    pngs = sorted(os.listdir(fdir))
    report["frames_every_0_5s"] = len(pngs)
    from PIL import Image, ImageDraw
    per = 12
    for sheet in range((len(pngs) + per - 1) // per):
        imgs = pngs[sheet * per:(sheet + 1) * per]
        W, H = 480, 270
        cs = Image.new("RGB", (W * 4, (H + 22) * 3), (20, 20, 24))
        d = ImageDraw.Draw(cs)
        for i, name in enumerate(imgs):
            im = Image.open(os.path.join(fdir, name)).convert("RGB").resize((W, H), Image.LANCZOS)
            x, y = (i % 4) * W, (i // 4) * (H + 22)
            cs.paste(im, (x, y + 22))
            t = (sheet * per + i) * 0.5
            d.text((x + 6, y + 4), f"{t:.1f}s", fill=(220, 220, 230))
        cs.save(os.path.join(out, f"sheet_{sheet + 1:02d}.jpg"), quality=88)
    json.dump(report, open(os.path.join(out, "verify.json"), "w"), indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
