import type { Metadata, Viewport } from "next";
import { Cairo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SubjectsBar from "@/components/SubjectsBar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Providers from "@/components/Providers";
import ScrollToTop from "@/components/ScrollToTop";
import CommandPalette from "@/components/CommandPalette";
import SuggestBox from "@/components/SuggestBox";
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
  // Only used inside code blocks (below the fold, never on the landing hero),
  // so don't preload it — frees up the critical path for faster first paint.
  preload: false,
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
  twitter: {
    card: "summary_large_image",
    title: "The Code Fix | تعلّم البرمجة بالعربي",
    description: "المرجع العربي الأول لتعلّم البرمجة بشروحات وأمثلة تفاعلية.",
    images: ["/logo.png"],
  },
  icons: { icon: "/icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#07060a" },
  ],
};

// Set the theme class before paint to avoid a flash of the wrong theme.
const themeScript = `
(function(){try{
  var t = localStorage.getItem('theme');
  if(!t){ t = 'dark'; }
  if(t === 'dark'){ document.documentElement.classList.add('dark'); }
}catch(e){ document.documentElement.classList.add('dark'); }})();
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
                "@type": ["Organization", "EducationalOrganization"],
                "@id": `${SITE_URL}/#organization`,
                name: "The Code Fix",
                alternateName: "ذا كود فيكس",
                url: SITE_URL,
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE_URL}/logo.png`,
                },
                description:
                  "المرجع العربي الأول لتعلّم البرمجة بشروحات وأمثلة تفاعلية واختبارات وشهادات.",
                knowsLanguage: "ar",
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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-purple focus:px-4 focus:py-2 focus:text-white"
      >
        تخطَّ إلى المحتوى
      </a>
      <div className="sticky top-0 z-50">
        <Header />
        <SubjectsBar />
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <ScrollToTop />
      <CommandPalette />
      <SuggestBox />
    </>
  );
  return isAuthEnabled() ? <Providers>{inner}</Providers> : inner;
}
