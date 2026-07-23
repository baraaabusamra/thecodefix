import { requireAdminCapability } from "@/lib/admin-access";

export default async function QuizzesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminCapability("content:edit");
  return children;
}
