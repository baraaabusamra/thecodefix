// Renders a JSON-LD <script> for SEO structured data (rich results).
// Safe in server components.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so a value containing "</script>" can't break out of the tag
  // (defense-in-depth XSS hardening for any user/CMS-derived strings).
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
