import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// Auth.js (NextAuth v5) config. Providers are added only when their env vars
// exist, so the app builds and runs fine with auth fully disabled.
//
// To activate, set in your environment (e.g. Vercel → Settings → Env Vars):
//   AUTH_SECRET            (generate: `npx auth secret`)
//   AUTH_GITHUB_ID / AUTH_GITHUB_SECRET     (GitHub OAuth app)
//   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET     (Google OAuth client)
//
// Uses JWT sessions (no database required to start). Add an adapter later to
// persist users/progress server-side. See SETUP.md.

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GITHUB_ID) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: {
    // optional custom sign-in page; default NextAuth UI used if omitted
  },
});
