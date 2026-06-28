import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "تواصل معنا",
  alternates: { canonical: "/contact" },
  description: "تواصل مع فريق The Code Fix عبر البريد الإلكتروني.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl font-extrabold md:text-5xl">
        تواصل <span className="neon-text-animated">معنا</span>
      </h1>
      <p className="mt-4 text-muted">
        يسعدنا سماع ملاحظاتك وأسئلتك واقتراحاتك. راسلنا وسنردّ في أقرب وقت ممكن.
      </p>

      <div className="glass card-glow mt-8 rounded-2xl p-6">
        <h2 className="text-lg font-bold">البريد الإلكتروني</h2>
        <p className="mt-2 text-muted">
          أرسل رسالتك إلى الفريق مباشرةً:
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          dir="ltr"
          className="btn-neon mt-4 px-6 py-3"
        >
          ✉️ {CONTACT_EMAIL}
        </a>
      </div>

      <div className="glass card-glow mt-6 rounded-2xl p-6">
        <h2 className="text-lg font-bold">للشركات والوظائف</h2>
        <p className="mt-2 text-muted">
          إذا كنت ترغب بنشر وظيفة أو التعاون كشركة، راسلنا على البريد نفسه مع ذكر
          التفاصيل.
        </p>
      </div>

      <p className="mt-6 text-sm text-muted">
        عادةً ما نردّ خلال يومي عمل.
      </p>
    </div>
  );
}
