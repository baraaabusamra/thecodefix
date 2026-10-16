// packages/content/src/i18n.ts
// 📍 خريطة: محرّك المحتوى ← اللغات المدعومة
//
// One table of locales for the whole platform (web, API, mobile).
// Arabic is the default and keeps today's unprefixed URLs (/learn/…);
// any other language is served under its own prefix (/en/learn/…) once
// its routes are enabled — see docs/v2/adr/0005-i18n.md.

export const LOCALES = {
  ar: { label: "العربية", dir: "rtl", htmlLang: "ar", urlPrefix: "", enabled: true },
  en: { label: "English", dir: "ltr", htmlLang: "en", urlPrefix: "/en", enabled: false },
} as const;

export type Locale = keyof typeof LOCALES;

export const DEFAULT_LOCALE: Locale = "ar";

/** Locales whose content and routes are live. */
export function enabledLocales(): Locale[] {
  return (Object.keys(LOCALES) as Locale[]).filter((l) => LOCALES[l].enabled);
}

export function isLocale(value: string): value is Locale {
  return Object.prototype.hasOwnProperty.call(LOCALES, value);
}

/** Prefix a site path for a locale: ("/learn/python", "en") → "/en/learn/python". */
export function localizePath(pathname: string, locale: Locale = DEFAULT_LOCALE): string {
  const prefix = LOCALES[locale].urlPrefix;
  return prefix ? `${prefix}${pathname === "/" ? "" : pathname}` : pathname;
}
