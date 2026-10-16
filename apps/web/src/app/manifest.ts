import type { MetadataRoute } from "next";

// Web app manifest — lets learners "add to home screen" on mobile and gives
// the PWA an on-brand name, colors, and icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Code Fix — تعلّم البرمجة بالعربي",
    short_name: "The Code Fix",
    description:
      "المرجع العربي الأول لتعلّم البرمجة: شروحات وأمثلة تفاعلية واختبارات وشهادات.",
    start_url: "/",
    display: "standalone",
    background_color: "#07060a",
    theme_color: "#b026ff",
    lang: "ar",
    dir: "rtl",
    categories: ["education", "developer"],
    icons: [
      { src: "/logo.png", sizes: "192x192", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
