import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import type { Role } from "@/lib/rbac";

// Auth.js (NextAuth v5) config. Providers are added only when their env vars
// exist, so the app builds and runs fine with auth fully disabled.
//
// To activate, set in your environment (e.g. Vercel → Settings → Env Vars):
//   AUTH_SECRET            (generate: `npx auth secret`)
//   AUTH_GITHUB_ID / AUTH_GITHUB_SECRET     (GitHub OAuth app)
//   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET     (Google OAuth client)
//
// When DATABASE_URL is also set, users are persisted via the Drizzle adapter
// and sessions are database-backed, exposing `session.user.role` for RBAC.
// Without a database it falls back to stateless JWT sessions.

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: db ? "database" : "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // Surface the DB-backed role on the session so server components and
    // route handlers can gate access with `can(session.user.role, ...)`.
    session({ session, user }) {
      if (user && session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: Role }).role;
      }
      return session;
    },
  },
});
