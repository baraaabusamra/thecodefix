import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "شروط الاستخدام",
  alternates: { canonical: "/terms" },
  description: `شروط وأحكام استخدام منصّة ${SITE_NAME}.`,
  keywords: ["شروط الاستخدام", "الشروط والأحكام", SITE_NAME],
};

const UPDATED = "21 يونيو 2026";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold md:text-4xl">شروط الاستخدام</h1>
      <p className="mt-2 text-sm text-muted">آخر تحديث: {UPDATED}</p>

      <p className="mt-6 text-muted">
        باستخدامك لمنصّة {SITE_NAME} فإنك توافق على هذه الشروط. يُرجى قراءتها
        بعناية.
      </p>

      <Section title="استخدام الموقع">
        <p>
          الموقع مخصّص للأغراض التعليمية. تلتزم باستخدامه بشكل قانوني وعدم إساءة
          استخدامه أو محاولة تعطيله أو الوصول غير المصرّح به إليه.
        </p>
      </Section>

      <Section title="الحسابات">
        <p>
          أنت مسؤول عن الحفاظ على سرّية حسابك وعن جميع الأنشطة التي تتم من خلاله.
          أبلغنا فورًا عند أي استخدام غير مصرّح به.
        </p>
      </Section>

      <Section title="المحتوى والملكية الفكرية">
        <p>
          المحتوى التعليمي والتصاميم والعلامة التجارية ملك لـ {SITE_NAME}. يُسمح
          لك باستخدام المحتوى لأغراض التعلّم الشخصي، ولا يجوز إعادة نشره تجاريًا
          دون إذن.
        </p>
      </Section>

      <Section title="الشهادات">
        <p>
          تُثبت الشهادات الصادرة إتمامك لاختبار على المنصّة، وهي ليست اعتمادًا
          أكاديميًا أو مهنيًا رسميًا.
        </p>
      </Section>

      <Section title="الاشتراكات والمدفوعات">
        <p>
          عند تفعيل الاشتراكات المدفوعة، تخضع عمليات الدفع لشروط مزوّد الدفع
          (Stripe). تُوضّح تفاصيل الأسعار في صفحة الاشتراك.
        </p>
      </Section>

      <Section title="إخلاء المسؤولية">
        <p>
          يُقدَّم الموقع &quot;كما هو&quot; دون أي ضمانات. لا نتحمّل مسؤولية أي
          أضرار ناتجة عن استخدام الموقع أو الاعتماد على محتواه.
        </p>
      </Section>

      <Section title="إنهاء الخدمة">
        <p>
          يحقّ لنا تعليق أو إنهاء أي حساب يخالف هذه الشروط دون إشعار مسبق.
        </p>
      </Section>

      <Section title="التعديلات">
        <p>
          قد نعدّل هذه الشروط أو الخدمة في أي وقت، وسننشر النسخة المحدّثة على هذه
          الصفحة. استمرارك في الاستخدام يعني موافقتك على التعديلات.
        </p>
      </Section>

      <Section title="تواصل معنا">
        <p>
          لأي استفسار حول هذه الشروط، راسلنا على{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            dir="ltr"
            className="text-brand-cyan hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 text-muted">{children}</div>
    </section>
  );
}
