import { resolveAdmin } from "@/lib/admin-access";
import TestClient from "./client";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function PipelineTestPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;

  // We require a high level of capability to access the testing UI. 
  // Let's use settings:manage as a proxy for superadmin/dev access.
  if (!can(access.role, "settings:manage")) {
    redirect("/admin");
  }

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Pipeline Discovery Test</h1>
      <p className="mb-8 text-sm text-muted">
        استخدم هذه الأداة لاختبار محرك البحث Tavily ونظام تقييم المصادر وتحديد الروابط الرسمية (Source Discovery & Ranking).
      </p>
      <TestClient />
    </div>
  );
}
