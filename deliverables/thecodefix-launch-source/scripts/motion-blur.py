#!/usr/bin/env python3
"""
Temporal supersampling -> 60 fps with real motion blur.

Inputs: HyperFrames renders of the same composition at 240 fps
  A: the film itself                         (sub-frame times  i/240 s)
  B: optional, rendered with --variables '{"subframeOffset": 1/480}'
                                              (sub-frame times  i/240 + 1/480 s)
Each sub-frame is a full re-render of the timeline at its own instant.

Output frame n (time n/60) is the linear-light, tent-weighted average of the
samples within ±1/240 s of n/60 — a 180° shutter with a triangular profile,
centred on the frame instant:
  A only : A[4n-1], A[4n], A[4n+1]                    weights 1,2,1  (/4)
  A + B  : A[4n-1], B[4n-1], A[4n], B[4n], A[4n+1]    weights 1,2,3,2,1 (/9)
The centre sample is the 60 fps frame itself, so every event stays on its
frame and the audio (copied from A, HyperFrames' own mix) stays in sync.

Usage: python3 scripts/motion-blur.py <A_240.mp4> [B_240.mp4] <out_60.mp4> [crf=14]
"""
import subprocess
import sys

import numpy as np

W, H = 1920, 1080
FS = W * H * 3
args = sys.argv[1:]
crf = "14"
if args and args[-1].isdigit():
    crf = args.pop()
if len(args) == 3:
    srcA, srcB, dst = args
elif len(args) == 2:
    srcA, dst = args
    srcB = None
else:
    sys.exit(__doc__)

s = np.arange(256) / 255.0
to_lin = np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4).astype(np.float32)
q = np.linspace(0, 1, 65536)
to_srgb = np.clip(np.round(255 * np.where(q <= 0.0031308, 12.92 * q, 1.055 * q ** (1 / 2.4) - 0.055)), 0, 255).astype(np.uint8)


class Stream:
    def __init__(self, path):
        self.p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, bufsize=FS * 4)
        self.frames, self.next = {}, 0

    def get(self, i):
        i = max(0, i)
        while self.next <= i:
            b = self.p.stdout.read(FS)
            if len(b) < FS:
                break
            self.frames[self.next] = to_lin[np.frombuffer(b, dtype=np.uint8)].reshape(H, W, 3)
            self.next += 1
        return self.frames.get(i, self.frames.get(self.next - 1))

    def drop_below(self, i):
        for k in [k for k in self.frames if k < i]:
            del self.frames[k]


A = Stream(srcA)
B = Stream(srcB) if srcB else None
enc = subprocess.Popen([
    "ffmpeg", "-v", "error", "-y",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "60", "-i", "-",
    "-i", srcA,
    "-map", "0:v", "-map", "1:a?",
    "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-level", "4.2", "-movflags", "+faststart",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "copy", "-t", "30", dst,
], stdin=subprocess.PIPE)

N = 1800
for n in range(N):
    c = 4 * n
    if B is None:
        mix = 0.25 * A.get(c - 1) + 0.5 * A.get(c) + 0.25 * A.get(c + 1)
    else:
        mix = (A.get(c - 1) + 2 * B.get(c - 1) + 3 * A.get(c) + 2 * B.get(c) + A.get(c + 1)) / 9.0
    out = to_srgb[np.clip((mix * 65535 + 0.5).astype(np.int32), 0, 65535)]
    enc.stdin.write(out.tobytes())
    A.drop_below(c - 1)
    if B:
        B.drop_below(c - 1)
    if (n + 1) % 120 == 0:
        print(f"{n + 1} frames", flush=True)

enc.stdin.close()
enc.wait()
print(f"wrote {N} frames to {dst} ({'A+B, 5-sample tent' if B else 'A, 3-sample tent'})")
