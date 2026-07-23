import { requireAdminCapability } from "@/lib/admin-access";

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminCapability("ops:manage");
  return children;
}
