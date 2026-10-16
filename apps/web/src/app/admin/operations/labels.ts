// Arabic labels + badge tones for the Operations section enums. Shared by the
// list/detail pages so wording stays consistent.

export const INSTRUCTOR_STATUS_LABELS: Record<string, string> = {
  contacting: "قيد التواصل",
  signed: "تم التوقيع",
  active: "نشط",
  paused: "متوقف",
};

export const INSTRUCTOR_STATUS_TONES: Record<string, string> = {
  contacting: "bg-yellow-500/10 text-yellow-500",
  signed: "bg-brand-cyan/10 text-brand-cyan",
  active: "bg-green-500/10 text-green-500",
  paused: "bg-red-500/10 text-red-500",
};

export const LESSON_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  review: "قيد المراجعة",
  published: "منشور",
  suspended: "موقوف",
};

export const LESSON_STATUS_TONES: Record<string, string> = {
  draft: "bg-border/50 text-muted",
  review: "bg-yellow-500/10 text-yellow-500",
  published: "bg-green-500/10 text-green-500",
  suspended: "bg-red-500/10 text-red-500",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  new: "جديدة",
  in_progress: "قيد المعالجة",
  closed: "مغلقة",
};

export const TICKET_STATUS_TONES: Record<string, string> = {
  new: "bg-brand-cyan/10 text-brand-cyan",
  in_progress: "bg-yellow-500/10 text-yellow-500",
  closed: "bg-green-500/10 text-green-500",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
};

export const TICKET_PRIORITY_TONES: Record<string, string> = {
  low: "text-muted",
  normal: "text-brand-cyan",
  high: "text-red-500",
};

/** Shared date formatter for the Operations tables. */
export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
