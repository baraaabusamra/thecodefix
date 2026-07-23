// Server-side text sanitization. Prevents XSS and data corruption before
// storage or display. Used by validation schemas in validation.ts.
// Always sanitize on the server — client-side sanitization is cosmetic only.

const TAG_RE = /<[^>]*>/g;
const MULTI_SPACE_RE = /[ \t]{2,}/g;
const MULTI_NEWLINE_RE = /\n{3,}/g;

/** Strip HTML tags, collapse whitespace, trim. Safe for plain-text fields. */
export function sanitizeText(raw: string): string {
  return raw
    .replace(TAG_RE, "")
    .replace(MULTI_SPACE_RE, " ")
    .replace(MULTI_NEWLINE_RE, "\n\n")
    .trim();
}

/** Strip everything except basic inline formatting tags. */
const ALLOWED_TAGS = /<\/?(b|i|em|strong|code|br|a\s[^>]*)>/gi;
const FORBIDDEN_ATTR = /\s(on\w+|href)\s*=\s*["'][^"']*["']/gi;

export function sanitizeBasicHtml(raw: string): string {
  const stripped = raw.replace(TAG_RE, (match) => {
    const lower = match.toLowerCase();
    const kept = ALLOWED_TAGS.test(match);
    ALLOWED_TAGS.lastIndex = 0;
    if (kept) {
      return match.replace(FORBIDDEN_ATTR, "");
    }
    return "";
  });
  return stripped.replace(MULTI_SPACE_RE, " ").trim();
}

/** Strip all HTML. This is the strictest mode (default for user text). */
export function sanitizeStrict(raw: string): string {
  return sanitizeText(raw);
}

/** Normalize a slug: lowercase, no spaces, only alphanumeric and hyphens. */
export function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
