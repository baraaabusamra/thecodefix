type SubmissionStatus = "pending" | "approved" | "rejected" | "needs_revision";

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  pending: {
    label: "قيد المراجعة",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  },
  approved: {
    label: "تمت الموافقة",
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  rejected: {
    label: "مرفوض",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  needs_revision: {
    label: "بحاجة لتعديل",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
};

export default function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
