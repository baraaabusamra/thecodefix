"use client";

import { useState, useEffect, useRef } from "react";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import QRCode from "qrcode";
import "@/components/certificate.css";

// The printable certificate itself, shared by both issuing flows: the
// server-graded one (SecureCertificate) and the legacy client-graded one
// (Certificate). Those differ in how they decide someone has earned a
// certificate; the sheet they produce should not differ at all.

// Faces the artwork was drawn around. `preload: false` keeps them off every
// other page's critical path — only the certificate pages render them.
const certDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cert-display",
  display: "swap",
  preload: false,
});

const certSans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cert-sans",
  display: "swap",
  preload: false,
});

// The artwork's intrinsic size; everything inside is positioned against it.
const CERT_W = 1600;
const CERT_H = 1000;

// Past this many characters the name no longer fits the rule at full size.
const LONG_NAME_CHARS = 26;

function formatCertDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())} / ${pad(d.getMonth() + 1)} / ${d.getFullYear()}`;
}

export default function CertificateArtwork({
  recipientName,
  trackTitle,
  issuedAt,
  certId,
  verifyUrl,
}: {
  recipientName: string;
  trackTitle: string;
  issuedAt: string;
  certId: string;
  verifyUrl: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [verifyUrl]);

  // The artwork is a fixed canvas, so it is scaled to the column rather than
  // reflowed — the layout must not move between a phone and a desktop, or the
  // design stops matching the printed sheet.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CERT_W));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const name = recipientName.trim();

  return (
    <div ref={stageRef} className="tcf-cert-stage" style={{ height: CERT_H * scale }}>
      <div
        id="certificate"
        dir="ltr"
        className={`tcf-cert ${certDisplay.variable} ${certSans.variable}`}
        style={{ ["--tcf-scale" as string]: scale }}
      >
        <div className="tcf-cert-border" />

        <div className="tcf-cert-tl-shape" />
        <div className="tcf-cert-tl-layer" />
        <div className="tcf-cert-tl-glow" />

        <div className="tcf-cert-circuit" aria-hidden="true">
          <i />
          <i />
          <b />
          <b />
        </div>

        <div className="tcf-cert-br-shape" />
        <div className="tcf-cert-br-line" />

        <div className="tcf-cert-wave tcf-cert-wave1" />
        <div className="tcf-cert-wave tcf-cert-wave2" />
        <div className="tcf-cert-wave tcf-cert-wave3" />

        <div className="tcf-cert-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" aria-hidden="true" />
          <div>
            <div className="tcf-cert-logo-text">
              TheCode<span>Fix</span>
            </div>
            <div className="tcf-cert-logo-sub">LEARN • PRACTICE • GROW</div>
          </div>
        </div>

        <div className="tcf-cert-future">
          BUILD
          <br />
          YOUR
          <br />
          FUTURE
        </div>

        <div className="tcf-cert-title">CERTIFICATE</div>

        <div className="tcf-cert-subtitle-row">
          <div className="tcf-cert-subtitle-line" />
          <div className="tcf-cert-subtitle">
            OF COMP<span>L</span>ETION
          </div>
          <div className="tcf-cert-subtitle-line" />
        </div>

        <div className="tcf-cert-awarded">THIS CERTIFICATE IS PROUDLY AWARDED TO</div>

        <div className="tcf-cert-recipient">
          <div
            className="tcf-cert-recipient-name"
            dir="auto"
            data-long={name.length > LONG_NAME_CHARS}
          >
            {name}
          </div>
          <div className="tcf-cert-recipient-label">RECIPIENT NAME</div>
        </div>

        <div className="tcf-cert-completed">FOR SUCCESSFULLY COMPLETING</div>

        <div className="tcf-cert-course">
          <div className="tcf-cert-course-name" dir="auto">
            {trackTitle}
          </div>
        </div>

        <div className="tcf-cert-desc">
          IN RECOGNITION OF DEDICATION, EFFORT, AND COMMITMENT TO LEARNING WITH THE CODE FIX.
        </div>

        <div className="tcf-cert-date">
          <div className="tcf-cert-date-value">{formatCertDate(issuedAt)}</div>
          <div className="tcf-cert-date-label">DATE (DD / MM / YYYY)</div>
        </div>

        <div className="tcf-cert-qr">
          <span />
          <span />
          <span />
          <span />
          {qrDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrDataUrl} alt={`رمز QR للتحقّق من الشهادة ${certId}`} />
          )}
        </div>

        <div className="tcf-cert-code">
          <em>CERTIFICATE ID</em>
          {certId}
        </div>

        <div className="tcf-cert-seal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thecodefix-seal.png" alt="" aria-hidden="true" />
        </div>

        <div className="tcf-cert-tagline">
          CODE
          <br />
          A BRIGHTER
          <br />
          TOMORROW
        </div>
      </div>
    </div>
  );
}
