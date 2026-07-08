// Readable text color for a colored button background: white on dark brand
// colors, near-black on light ones (JS yellow, Flutter cyan…). WCAG relative
// luminance with a threshold tuned so mid violets/blues keep white text.
export function onColor(hex: string): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const channel = (i: number) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return lum > 0.35 ? "#111018" : "#ffffff";
}
