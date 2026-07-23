# The Code Fix — Troubleshooting Log

> Knowledge base documenting bugs, errors, and technical issues encountered during development, with exact solutions and workarounds applied.

---

## 🐞 Build & Compilation

### MDX Parsing: Angle Brackets in Prose Breaks Build

**Symptom:** `npm run build` fails with JSX parsing error in MDX files containing raw `<T>` or `<Tag>` patterns (e.g., generic types like `vector<T>`, `List<String>`).

**Root Cause:** MDX treats `<` followed by a capital letter as JSX. Angle brackets in headings or prose (outside code fences) get parsed as JSX components.

**Solution:** Wrap all angle-bracket patterns in backticks when outside code fences:
```mdx
- Before: `vector<T>` ← OK in code fence
- After: `vector<T>` ← actual backticks
```
**Affected files:** `src/content/tracks/rust/21-generics.mdx`, `csharp/02-control.mdx`, `cpp/*.mdx`, `java/*.mdx`

**Status:** Fixed. Always use backticks for generics/angle-brackets in MDX headings and prose.

---

### MDX: Summary Lesson Footer Redirect

**Symptom:** After expanding a track's lessons, the last old lesson's footer still links to "Next: Summary" which may be renamed or reordered.

**Root Cause:** The old final lesson's `.mdx` footer contained a hardcoded `> 🎉 أكملت جميع دروس [track]!` message instead of linking to the actual next lesson.

**Solution:** When adding new lessons, update the previous last lesson's footer to point to the new first lesson:
```mdx
> 🎯 التالي: [Next Lesson Title]
```
**Status:** Fixed per-track during expansion.

---

### Build: Transient Neon Fetch Errors

**Symptom:** `npm run build` fails with seemingly random fetch errors when connecting to Neon Postgres during static generation.

**Root Cause:** Serverless Neon connections can be rate-limited or timeout during parallel static page generation.

**Solution:** Simply retry `npm run build`. The build is idempotent and succeeds on retry.

**Status:** Known limitation. No permanent fix needed.

---

## 🎨 Content

### Google Security Flag: "Deceptive Site"

**Symptom:** Google flagged the site as deceptive. Root cause was live malicious sample code in a cybersecurity lesson.

**Root Cause:** `src/content/tracks/cybersecurity/01-threats.mdx` contained executable malicious code samples (for educational purposes) that Google's crawler detected.

**Solution:** Sanitized all cybersecurity content — removed all live payloads. Kept content strictly defensive/theoretical. No executable exploit code anywhere.

**Remaining Flag:** Likely false positive (new domain + login page). Needs time (days–~2 weeks) for Google to re-review. Check Search Console → Security Issues.

**Policy going forward:** Cybersecurity track: NO live malicious code. Keep content strictly educational/defensive.

---

### Content Duplication: Old "03-oop" C# Lesson

**Symptom:** The old `03-oop` C# lesson was a condensed duplicate of the dedicated OOP track series (lessons 12–17), causing SEO and content confusion.

**Solution:** Added permanent 301 redirect from `/learn/csharp/03-oop` to `/learn/csharp/12-classes-objects` in `next.config.ts`.

**Status:** Fixed.

---

## 🔧 Infrastructure

### Git Auto-Deploy Unreliable

**Symptom:** Vercel auto-deploy from GitHub does not always trigger after `git push`.

**Root Cause:** Integration timing issues between GitHub and Vercel.

**Solution:** Use manual Vercel deployment after push:
```bash
vercel deploy --prod --yes
```

**Status:** Known workaround.

---

### Merge Conflicts on Pull

**Symptom:** `git pull origin main` results in numerous merge conflicts across content files, schema, and components.

**Root Cause:** Divergent histories between local and remote (43 local commits vs 319 remote commits, forced updates).

**Solution:** Abort the merge (`git merge --abort`), then selectively integrate changes or use `git pull --rebase`.

**Status:** Resolved by merge abort. Future pulls should be coordinated.

---

### Database Configuration Dormancy Pattern

**Symptom:** Pages crash or throw errors when database env vars are not configured.

**Root Cause:** Code paths that access `db` without checking if it's null.

**Solution:** Always follow the pattern: `if (!db) return null;` for all DB queries. Wrap DB-dependent code in null checks. Use `isDbEnabled()` for feature gating.

**Pattern (correct):**
```typescript
export async function listUsers(): Promise<AdminUserRow[] | null> {
  if (!db) return null;
  // ... actual query
}
```

**Status:** Fixed across all query helpers.

---

## ⚡ Rate Limiting Architecture

### Serverless In-Memory Rate Limiter

**Decision:** Use in-memory `Map` with periodic cleanup (60s interval) instead of Upstash Redis.

**Rationale:** 
- No external KV store is configured (no Upstash env vars)
- Vercel serverless functions have in-memory state per-instance, so rate limiting is approximate per-instance
- Designed with swappable `RateLimitStore` interface for future Upstash migration:
```typescript
type RateLimitStore = {
  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number };
};
export function setRateLimitStore(s: RateLimitStore) { store = s; }
```

**Tiered Limits:**
| Action | Limit | Window |
|--------|-------|--------|
| Auth (admin key) | 5 | 1 min |
| Suggestions | 20 | 1 min |
| Certificate | 10 | 1 min |
| Progress saves | 100 | 1 min |
| Admin writes | 60 | 1 min |
| General | 30 | 1 min |

**Key Strategy:** IP-based for unauthenticated, user ID for authenticated. Uses `x-forwarded-for` header (Vercel standard).

**Status:** Implemented in `src/lib/rate-limit.ts`, applied to 30+ server actions.

---

## 🛠️ Dependency & API Changes

### Zod v4 Breaking API Changes

**Symptom:** `z.record(z.array(z.string()))` caused TS error `Expected 2-3 arguments, but got 1`.

**Root Cause:** Zod v4 changed `z.record()` to require both key and value schemas: `z.record(keySchema, valueSchema)`. The v3 single-argument shorthand (`z.record(valueSchema)`) was removed.

**Solution:** Update all `z.record()` calls to two-argument form:
```typescript
// Before (v3)
z.record(z.array(z.string()))

// After (v4)
z.record(z.string(), z.array(z.string()))
```

**Affected files:** `src/app/progress-actions.ts`

---

### Zod v4: `ROLES` Enum Type Narrowing

**Symptom:** `z.enum(ROLES as [string, ...string[]])` fails — `ROLES` is `readonly` and cannot be cast to mutable tuple.

**Root Cause:** Zod v4's `z.enum()` requires a mutable tuple type, but `ROLES` is declared `as const` (immutable).

**Solution:** Use double cast: `ROLES as unknown as [string, ...string[]]`.

**Affected files:** `src/app/admin/settings/actions.ts`

---

### Zod Not Installed as Project Dependency

**Symptom:** All Zod imports fail with `Cannot find module 'zod'`.

**Root Cause:** Zod was not listed in `package.json` dependencies (v3 was never installed).

**Solution:** Run `npm install zod` — installed `zod@4.4.3`.

**Status:** Fixed.

---

## 🔒 Security

### Admin Token Timing Attack

**Symptom:** Admin token comparison using string `===` is vulnerable to timing attacks.

**Root Cause:** Standard JS string comparison exits early on first non-matching character.

**Solution:** Used `timingSafeEqual` from `node:crypto` for constant-time comparison:

```typescript
import { timingSafeEqual } from "node:crypto";
function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
```

**Status:** Fixed in `src/lib/admin-access.ts`.

---

### Admin Panel Production Safety

**Symptom:** When neither RBAC nor `ADMIN_TOKEN` is configured, admin panel is accessible in development.

**Root Cause:** Token-free access was allowed for local development.

**Solution:** Added production check: if `NODE_ENV === "production"` and no token/RBAC, fail closed:
```typescript
if (!token) {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, mode: "token", reason: "key" };
  }
  return { ok: true, mode: "token", role: "owner" };
}
```

**Status:** Fixed in `src/lib/admin-access.ts`.

---

## 📱 UI/UX

### RTL Layout: Grid and Flexbox

**Symptom:** Layout breaks in RTL mode when using left/right specific utilities (e.g., `left-0`, `right-4`, `ml-2`, `mr-2`).

**Root Cause:** Using direction-specific Tailwind utilities instead of logical properties.

**Solution:** Always use logical CSS properties and Tailwind logical classes:
- `margin-inline-start` / `ms-4` instead of `ml-4`
- `margin-inline-end` / `me-4` instead of `mr-4`
- `border-inline-start` instead of `border-left`
- `text-align: start/end` instead of `left/right`
- `<bdi>` tags for mixed text direction

**Status:** Applied site-wide.

---

### Theme Flash on Load

**Symptom:** White flash on dark-mode preferred browsers before React hydration.

**Root Cause:** Theme preference stored in localStorage, read only after JS loads.

**Solution:** Added inline theme script in `<head>` before any CSS loads:
```html
<script>/* set dark class from localStorage before paint */</script>
```

**Status:** Fixed in `src/app/layout.tsx`.

---

## 📊 Quizzes

### Quiz JSON Validation

**Symptom:** Invalid quiz JSON causes build failures that are hard to debug.

**Root Cause:** Hand-edited quiz JSON files with missing commas, trailing commas, or incorrect structure.

**Solution:** Validate quiz JSON with Python before build:
```bash
python -c "import json; json.load(open('src/content/quizzes/<track>.json'))"
```

**Status:** Process documented. Consider adding programmatic validation.

---

## 🧪 Playground

### Python Pyodide WASM Download

**Symptom:** First Python playground run downloads ~6MB WASM binary, causing delay.

**Root Cause:** Pyodide runs Python via WebAssembly, which must be downloaded from CDN on first use.

**Solution:** Cache the WASM binary in browser's Cache API. Show loading indicator during first download. No server-side fix needed.

**Status:** Acceptable behavior. Documented in session handoff.
