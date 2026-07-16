import { redirect } from "next/navigation";

// The Operations group has no overview of its own — land on instructors.
export default function OperationsIndexPage() {
  redirect("/admin/operations/instructors");
}
