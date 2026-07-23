import { requireAdminCapability } from "@/lib/admin-access";

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminCapability("content:edit");
  return children;
}
