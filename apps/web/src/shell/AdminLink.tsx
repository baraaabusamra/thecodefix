"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { can } from "@tcf/identity/rbac";

// Client-side admin gear for RBAC mode. Reading the session client-side keeps
// the server-rendered Header (and thus every page) statically renderable —
// calling auth()/cookies() in the layout would force the whole site dynamic.
export default function AdminLink() {
  const { data } = useSession();
  if (!can(data?.user?.role, "admin:view")) return null;
  return (
    <Link
      href="/admin"
      className="rounded px-2 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
      title="لوحة الإدارة"
    >
      ⚙️
    </Link>
  );
}
