import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findCertificate } from "@/lib/admin-certificates";

// Dynamic Open Graph card for a shared certificate (used by /verify?code=).
// Looks up the cert by its public code and renders the recipient + track on a
// branded neon card, so a shared LinkedIn/X link shows the real credential.
// Falls back to a generic card when the code is missing or not found.
export const size = { width: 1200, height: 630 };

async function fonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [bold, regular] = await Promise.all([
    readFile(join(dir, "Tajawal-Bold.ttf")),
    readFile(join(dir, "Tajawal-Regular.ttf")),
  ]);
  return { bold, regular };
}

export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get("code") ?? "").trim();
  const cert = code ? await findCertificate(code).catch(() => undefined) : undefined;
  const { bold, regular } = await fonts();

  const name = cert?.recipientName ?? "";
  const trackTitle = cert?.trackTitle ?? "";

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
            🎓 شهادة إتمام
          </div>
        </div>

        {/* Body */}
        {name ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 30, color: "#9aa0ad" }}>
              تشهد المنصّة بأنّ
            </div>
            <div style={{ display: "flex", fontSize: 70, fontWeight: 700, color: "#ffffff" }}>
              {name}
            </div>
            <div style={{ display: "flex", fontSize: 34, color: "#9aa0ad" }}>
              أتمّ بنجاح مسار
            </div>
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#b026ff" }}>
              {trackTitle}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 62, fontWeight: 700, color: "#ffffff" }}>
              شهادة إتمام مسار برمجي
            </div>
            <div style={{ display: "flex", fontSize: 32, color: "#9aa0ad" }}>
              تعلّم البرمجة بالعربي واحصل على شهادتك المعتمدة
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 26, color: "#9aa0ad" }}>thecodefix.net</div>
          <div style={{ display: "flex", fontSize: 26, color: "#ff5cc8" }}>
            {code ? `رقم: ${code}` : "تعلّم البرمجة بالعربي"}
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
