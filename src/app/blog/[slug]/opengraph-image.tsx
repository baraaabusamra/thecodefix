import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPost } from "@/lib/blog";

// Branded social share card for blog articles — the pillar/comparison/
// troubleshooting posts being actively distributed. Title on the neon brand
// background so a shared link previews richly instead of a bare logo.
export const alt = "The Code Fix — مقالة";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function arabicFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [bold, regular] = await Promise.all([
    readFile(join(dir, "Tajawal-Bold.ttf")),
    readFile(join(dir, "Tajawal-Regular.ttf")),
  ]);
  return { bold, regular };
}

function titleSize(title: string): number {
  const n = title.length;
  if (n <= 30) return 72;
  if (n <= 45) return 60;
  if (n <= 65) return 50;
  return 42;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  const { bold, regular } = await arabicFonts();
  const title = post?.title ?? "مقالة";

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

        {/* Brand + badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
            The Code Fix
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#00f5ff",
              border: "2px solid rgba(0,245,255,0.45)",
              background: "rgba(0,245,255,0.08)",
              borderRadius: 999,
              padding: "8px 24px",
            }}
          >
            📝 المدوّنة
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: titleSize(title),
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.3,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#9aa0ad" }}>thecodefix.net</div>
          <div style={{ display: "flex", fontSize: 26, color: "#ff5cc8" }}>
            تعلّم البرمجة بالعربي
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Tajawal", data: regular, style: "normal", weight: 400 },
        { name: "Tajawal", data: bold, style: "normal", weight: 700 },
      ],
    }
  );
}
