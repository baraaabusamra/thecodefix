import { resolveAdmin } from "@tcf/identity/admin-access";
import TestClient from "./client";
import { can } from "@tcf/identity/rbac";
import { isCurriculumExtractionEnabled } from "@tcf/core/flags";
import { redirect } from "next/navigation";

export default async function PipelineTestPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;

  // We require a high level of capability to access the testing UI. 
  // Let's use settings:manage as a proxy for superadmin/dev access.
  if (!can(access.role, "settings:manage")) {
    redirect("/admin");
  }

  const extractionEnabled = isCurriculumExtractionEnabled();

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Pipeline Discovery &amp; Runner</h1>
      <p className="mb-8 text-sm text-muted">
        شغّل مراحل خط أنابيب المناهج يدويًا (تجميع/استخراج)، أو اختبر محرك البحث Tavily ونظام تقييم المصادر وتحديد الروابط الرسمية (Source Discovery &amp; Ranking) بمعزل.
      </p>
      <TestClient extractionEnabled={extractionEnabled} />
    </div>
  );
}
