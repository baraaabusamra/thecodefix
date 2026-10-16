import { getTracks } from "@tcf/content/tracks";
import { can, type Capability, type Role } from "@tcf/identity/rbac";
import AdminCommandPaletteClient, {
  type AdminPaletteItem,
} from "@tcf/admin/ui/AdminCommandPaletteClient";

// Builds the capability-filtered admin search index and hands it to the client
// palette. Rendered inside the admin layout so it only loads for admins.
const SECTIONS: { cap: Capability | null; label: string; url: string }[] = [
  { cap: null, label: "الرئيسية", url: "/admin" },
  { cap: "content:edit", label: "الخريطة الاستراتيجية", url: "/admin/roadmap" },
  { cap: "content:edit", label: "المحتوى والتوثيق", url: "/admin/content" },
  { cap: "content:edit", label: "الاختبارات والشهادات", url: "/admin/quizzes" },
  { cap: "users:manage", label: "المستخدمون والدعم", url: "/admin/users" },
  { cap: "billing:manage", label: "الاشتراكات والشركات", url: "/admin/billing" },
  { cap: "jobs:moderate", label: "لوحة الوظائف", url: "/admin/jobs" },
  { cap: "content:edit", label: "تشخيص المحتوى", url: "/admin/diagnostics" },
  { cap: "seo:manage", label: "أدوات SEO", url: "/admin/seo" },
  { cap: "ops:manage", label: "إدارة المحاضرين", url: "/admin/operations/instructors" },
  { cap: "ops:manage", label: "إدارة المحتوى (العمليات)", url: "/admin/operations/content" },
  { cap: "ops:manage", label: "متابعة التواصل", url: "/admin/operations/outreach" },
  { cap: "reports:submit", label: "تقارير الفريق", url: "/admin/reports" },
  { cap: "ops:manage", label: "تذاكر الدعم", url: "/admin/operations/tickets" },
  { cap: "settings:manage", label: "الإعدادات والصلاحيات", url: "/admin/settings" },
  { cap: "content:edit", label: "سجل التطوير", url: "/admin/changelog" },
];

export default async function AdminCommandPalette({ role }: { role: Role }) {
  const items: AdminPaletteItem[] = [];

  for (const s of SECTIONS) {
    if (s.cap === null || can(role, s.cap)) {
      items.push({ t: s.label, s: "قسم", u: s.url });
    }
  }

  const tracks = await getTracks();
  const canContent = can(role, "content:edit");
  for (const tr of tracks) {
    if (canContent) {
      items.push({ t: `اختبار ${tr.title}`, s: "محرّر الاختبار", u: `/admin/quizzes/${tr.slug}` });
    }
    items.push({ t: `عرض ${tr.title}`, s: "المسار العامّ", u: `/learn/${tr.slug}` });
  }

  return <AdminCommandPaletteClient items={items} />;
}
