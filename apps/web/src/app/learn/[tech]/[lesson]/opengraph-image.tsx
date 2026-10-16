import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getLesson, getTrack } from "@tcf/content/tracks";

// Per-lesson social share card: branded dark-neon background with the lesson
// title + track, so links shared to X/Facebook/WhatsApp/LinkedIn show a rich
// preview instead of a bare logo. Statically generated at build time.
export const alt = "The Code Fix — تعلّم البرمجة بالعربي";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori needs a raw static TTF to shape Arabic (without it, Arabic renders as
// empty boxes). Tajawal is a geometric Arabic face matching the site's look;
// the bundled @vercel/og font parser can't read variable fonts, so we ship
// static weights.
async function arabicFonts() {
  const dir = join(process.cwd(), "assets", "fonts");
  const [bold, regular] = await Promise.all([
    readFile(join(dir, "Tajawal-Bold.ttf")),
    readFile(join(dir, "Tajawal-Regular.ttf")),
  ]);
  return { bold, regular };
}

// Shrink very long titles so they stay on the card.
function titleSize(title: string): number {
  const n = title.length;
  if (n <= 22) return 76;
  if (n <= 34) return 64;
  if (n <= 48) return 52;
  return 44;
}

export default async function Image({
  params,
}: {
  params: Promise<{ tech: string; lesson: string }>;
}) {
  const { tech, lesson } = await params;
  const [data, track, fonts] = await Promise.all([
    getLesson(tech, lesson),
    getTrack(tech),
    arabicFonts(),
  ]);

  const title = data?.title ?? "تعلّم البرمجة بالعربي";
  const trackTitle = `${track?.title ?? "البرمجة"} بالعربي`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07060a",
          fontFamily: "Tajawal",
          direction: "rtl",
          padding: 72,
          position: "relative",
        }}
      >
        {/* Aurora glows — match the homepage's animated background */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -120,
            width: 540,
            height: 540,
            display: "flex",
            background:
              "radial-gradient(circle, rgba(176,38,255,0.55), rgba(176,38,255,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -120,
            width: 580,
            height: 580,
            display: "flex",
            background:
              "radial-gradient(circle, rgba(0,245,255,0.40), rgba(0,245,255,0) 70%)",
          }}
        />

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            The Code Fix
          </div>
        </div>

        {/* Track badge + lesson title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                color: "#00f5ff",
                border: "2px solid rgba(0,245,255,0.45)",
                background: "rgba(0,245,255,0.08)",
                borderRadius: 999,
                padding: "10px 28px",
              }}
            >
              {trackTitle}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: titleSize(title),
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.3,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, color: "#9aa0ad" }}>
            thecodefix.net
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#ff5cc8" }}>
            تعلّم البرمجة بالعربي
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Tajawal", data: fonts.regular, style: "normal", weight: 400 },
        { name: "Tajawal", data: fonts.bold, style: "normal", weight: 700 },
      ],
    }
  );
}
