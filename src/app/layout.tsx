import type { Metadata } from "next";
import { Cairo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SubjectsBar from "@/components/SubjectsBar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site";
import { isAuthEnabled } from "@/lib/flags";

const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Code Fix | تعلّم البرمجة بالعربي",
    template: "%s | The Code Fix",
  },
  description:
    "المرجع العربي الأول لتعلّم البرمجة: شروحات واضحة وأمثلة تفاعلية لـ HTML و CSS و JavaScript و React و Python والمزيد.",
  keywords: [
    "تعلم البرمجة بالعربي",
    "جافاسكريبت بالعربي",
    "HTML بالعربي",
    "CSS بالعربي",
    "React بالعربي",
    "Python بالعربي",
  ],
  openGraph: {
    title: "The Code Fix | تعلّم البرمجة بالعربي",
    description: "المرجع العربي الأول لتعلّم البرمجة بشروحات وأمثلة تفاعلية.",
    url: SITE_URL,
    siteName: "The Code Fix",
    locale: "ar_AR",
    type: "website",
    images: ["/logo.png"],
  },
  icons: { icon: "/icon.png" },
  alternates: {
    canonical: SITE_URL,
    languages: { "ar": SITE_URL, "en": "https://en.thecodefix.com" },
  },
};

// Set the theme class before paint to avoid a flash of the wrong theme.
const themeScript = `
(function(){try{
  var t = localStorage.getItem('theme');
  if(!t){ t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  if(t === 'dark'){ document.documentElement.classList.add('dark'); }
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "The Code Fix",
                url: SITE_URL,
                description:
                  "المرجع العربي الأول لتعلّم البرمجة بشروحات وأمثلة تفاعلية.",
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: "The Code Fix",
                inLanguage: "ar",
                publisher: { "@id": `${SITE_URL}/#organization` },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ],
          }}
        />
        <AppShell>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

// Wrap the app in the auth SessionProvider only when auth is enabled, so the
// live site has zero auth overhead until keys are configured.
function AppShell({ children }: { children: React.ReactNode }) {
  const inner = (
    <>
      <div className="sticky top-0 z-50">
        <Header />
        <SubjectsBar />
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
  return isAuthEnabled() ? <Providers>{inner}</Providers> : inner;
}
