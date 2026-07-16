import type { Role } from "@/lib/rbac";
import type { DefaultSession } from "next-auth";

// Add the RBAC role to the Auth.js session/user types.
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
  }
}
