// Arabic labels + badge tones for the Team Reports section.
import type { ReportRow } from "@tcf/admin/reports";

export const REPORT_CATEGORY_LABELS: Record<ReportRow["category"], string> = {
  social_media: "سوشيال ميديا",
  podcast: "بودكاست",
  event: "تنظيم إيفنت",
  photography: "تصوير",
  content_writing: "كتابة محتوى",
  design: "تصميم",
  other: "أخرى",
};

export const REPORT_CATEGORY_ICONS: Record<ReportRow["category"], string> = {
  social_media: "📣",
  podcast: "🎙️",
  event: "🎪",
  photography: "📸",
  content_writing: "✍️",
  design: "🎨",
  other: "🗂️",
};

export const REPORT_STATUS_LABELS: Record<ReportRow["status"], string> = {
  pending: "بانتظار الموافقة",
  approved: "مقبول",
  rejected: "مرفوض",
};

export const REPORT_STATUS_TONES: Record<ReportRow["status"], string> = {
  pending: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
  approved: "border-green-500/40 bg-green-500/10 text-green-500",
  rejected: "border-red-500/40 bg-red-500/10 text-red-500",
};

export function fmtReportDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
