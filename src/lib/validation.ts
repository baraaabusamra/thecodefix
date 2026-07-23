import { z } from "zod";
import { sanitizeText, sanitizeSlug } from "./sanitize";

// ── Primitives ──────────────────────────────────────────────────────────────

export const id = z.string().min(1, "ID is required").max(100);
export const slug = z
  .string()
  .min(1, "Slug is required")
  .max(100)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
  .transform(sanitizeSlug);
export const trackSlug = slug;
export const emailField = z
  .string()
  .max(255)
  .email("Invalid email")
  .optional()
  .or(z.literal(""));
export const urlField = z.string().max(2000).url("Invalid URL").optional().or(z.literal(""));
export const jsonContent = z.string().min(1).refine(
  (s) => { try { JSON.parse(s); return true; } catch { return false; } },
  "Invalid JSON string"
);

// ── Text fields with sanitization ───────────────────────────────────────────

/** Plain text: HTML stripped, whitespace collapsed. */
export const safeText = z.string().min(1).max(5000).transform(sanitizeText);

/** Optional text field: null/empty → undefined after sanitization. */
export const safeTextOptional = z
  .string()
  .max(5000)
  .optional()
  .default("")
  .transform((s) => (s ? sanitizeText(s) : ""));

/** Longer plain text (e.g. report details, ticket body). */
export const safeLongText = z.string().min(1).max(50000).transform(sanitizeText);

/** CMS content / MDX body — may contain HTML. Length: up to 100 KB. */
export const safeContent = z.string().min(1).max(100000);

// ── Enums ────────────────────────────────────────────────────────────────────

export const keywordPosition = z.coerce.number().int().min(0).max(10000).optional();
export const lessonOrder = z.coerce.number().int().min(0).max(9999);
export const score = z.number().int().min(0).max(10000);

// ── Server action helpers ────────────────────────────────────────────────────

type FormSchema<T extends z.ZodTypeAny> = {
  parse: (formData: FormData) => z.infer<T>;
  safeParse: (formData: FormData) => { success: true; data: z.infer<T> } | { success: false; error: z.ZodError };
};

/**
 * Wraps a Zod schema so it can be used directly with FormData.
 * Call `validate(formData)` to get typed validated data.
 */
export function formSchema<T extends z.ZodRawShape>(
  shape: T
): FormSchema<z.ZodObject<T>> {
  const schema = z.object(shape);
  return {
    parse(formData: FormData) {
      const raw: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const value = formData.get(key);
        raw[key] = value instanceof File ? value : (value ?? "");
      }
      return schema.parse(raw);
    },
    safeParse(formData: FormData) {
      const raw: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const value = formData.get(key);
        raw[key] = value instanceof File ? value : (value ?? "");
      }
      return schema.safeParse(raw);
    },
  };
}

/** Result type returned by validated server actions. */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
