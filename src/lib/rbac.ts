// Capability-based access control. Each role grants a set of capabilities that
// map to admin sections. Use `can(role, capability)` to gate UI and actions.

export const ROLES = [
  "student",
  "support",
  "writer",
  "sales",
  "operations",
  "marketing",
  "designer",
  "admin",
  "owner",
] as const;

export type Role = (typeof ROLES)[number];

export type Capability =
  | "admin:view" // see the admin panel at all
  | "content:edit" // docs, quizzes, learning paths
  | "users:manage" // student accounts, support tickets
  | "billing:manage" // subscriptions, B2B licenses, invoices
  | "jobs:moderate" // company review, job ads moderation
  | "seo:manage" // keyword tracker, structured data, web vitals
  | "ops:manage" // Operations section: instructors, content review, tickets
  | "reports:submit" // ops team members: log work reports (تقارير الفريق)
  | "reports:review" // approve/reject team reports (operations manager and up)
  | "settings:manage"; // roles, appearance, logs, backups

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  student: [],
  support: ["admin:view", "users:manage"],
  writer: ["admin:view", "content:edit", "seo:manage"],
  sales: ["admin:view", "billing:manage"],
  operations: ["admin:view", "ops:manage", "reports:submit", "reports:review"],
  // Ops team members: they see the admin panel only to file work reports.
  marketing: ["admin:view", "reports:submit"],
  designer: ["admin:view", "reports:submit"],
  admin: [
    "admin:view",
    "content:edit",
    "users:manage",
    "billing:manage",
    "jobs:moderate",
    "seo:manage",
    "ops:manage",
    "reports:submit",
    "reports:review",
  ],
  owner: [
    "admin:view",
    "content:edit",
    "users:manage",
    "billing:manage",
    "jobs:moderate",
    "seo:manage",
    "ops:manage",
    "reports:submit",
    "reports:review",
    "settings:manage",
  ],
};

export function can(role: Role | undefined | null, cap: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(cap) ?? false;
}

/** All capabilities a role holds — handy for building the admin nav. */
export function capabilitiesFor(role: Role | undefined | null): Capability[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role] ?? [];
}

// Arabic labels for surfacing roles in the (RTL) admin UI.
export const ROLE_LABELS: Record<Role, string> = {
  student: "طالب",
  support: "دعم فني",
  writer: "كاتب محتوى",
  sales: "مدير مبيعات",
  operations: "مسؤول عمليات",
  marketing: "تسويق وسوشيال ميديا",
  designer: "مصمّم",
  admin: "مشرف",
  owner: "المالك",
};
