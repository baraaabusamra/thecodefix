import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "لوحة الوظائف",
  description: "وظائف برمجية في العالم العربي — قريبًا.",
};

export default function JobsPage() {
  return (
    <ComingSoon
      title="لوحة الوظائف"
      note="ستتمكّن الشركات من نشر وظائفها، وسيجد المتعلّمون أول فرصهم هنا. قريبًا."
    />
  );
}
