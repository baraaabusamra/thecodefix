import { requireAdminCapability } from "@/lib/admin-access";

export default async function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminCapability("jobs:moderate");
  return children;
}
