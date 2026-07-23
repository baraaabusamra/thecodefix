export const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
  needs_revision: "بحاجة لتعديل",
};

export const SUBMISSION_STATUS_TONES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-red-500/10 text-red-500",
  needs_revision: "bg-orange-500/10 text-orange-500",
};

export const CREATOR_STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
};

export const CREATOR_STATUS_TONES: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  suspended: "bg-red-500/10 text-red-500",
};

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
