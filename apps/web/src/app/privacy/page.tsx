import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME } from "@tcf/core/site";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  alternates: { canonical: "/privacy" },
  description: `كيف يجمع ${SITE_NAME} بياناتك ويستخدمها ويحميها.`,
  keywords: ["سياسة الخصوصية", "خصوصية البيانات", SITE_NAME],
};

const UPDATED = "21 يونيو 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold md:text-4xl">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-muted">آخر تحديث: {UPDATED}</p>

      <p className="mt-6 text-muted">
        تشرح هذه السياسة كيف يجمع {SITE_NAME} (&quot;نحن&quot;) بياناتك عند استخدامك
        لموقعنا، وكيف نستخدمها ونحميها. باستخدامك للموقع فإنك توافق على ما ورد
        هنا.
      </p>

      <Section title="البيانات التي نجمعها">
        <ul className="space-y-2">
          <li>
            <strong>معلومات الحساب:</strong> عند تسجيل الدخول عبر GitHub أو Google
            نتلقّى اسمك وبريدك الإلكتروني وصورتك (إن وُجدت).
          </li>
          <li>
            <strong>بيانات التعلّم:</strong> تقدّمك في الدروس، ونتائج اختباراتك،
            والشهادات الصادرة لك.
          </li>
          <li>
            <strong>بيانات تقنية:</strong> ملفات تعريف الارتباط (Cookies)
            الضرورية للحفاظ على جلسة تسجيل دخولك.
          </li>
        </ul>
      </Section>

      <Section title="كيف نستخدم بياناتك">
        <ul className="space-y-2">
          <li>تقديم الخدمة وحفظ تقدّمك ومزامنته عبر أجهزتك.</li>
          <li>إصدار الشهادات والتحقّق من صحّتها.</li>
          <li>تحسين المحتوى وتجربة الاستخدام.</li>
        </ul>
      </Section>

      <Section title="المشاركة مع أطراف ثالثة">
        <p>
          لا نبيع بياناتك. نستعين بمزوّدي خدمة موثوقين لتشغيل المنصّة فقط، ومنهم:
        </p>
        <ul className="mt-2 space-y-2">
          <li>
            <strong>Vercel</strong> — استضافة الموقع.
          </li>
          <li>
            <strong>Neon</strong> — قاعدة البيانات.
          </li>
          <li>
            <strong>GitHub و Google</strong> — تسجيل الدخول.
          </li>
          <li>
            <strong>Stripe</strong> — معالجة المدفوعات (عند تفعيل الاشتراكات).
          </li>
        </ul>
      </Section>

      <Section title="ملفات تعريف الارتباط (Cookies)">
        <p>
          نستخدم ملفات ارتباط ضرورية لتسجيل الدخول وحفظ تفضيلاتك (مثل الوضع
          الداكن). لا نستخدمها للتتبّع الإعلاني.
        </p>
      </Section>

      <Section title="حقوقك">
        <p>
          يمكنك الوصول إلى بياناتك أو تصحيحها أو طلب حذف حسابك وبياناته في أي وقت
          عبر مراسلتنا.
        </p>
      </Section>

      <Section title="أمان البيانات">
        <p>
          نتّخذ تدابير معقولة لحماية بياناتك، لكن لا يمكن ضمان أمان أي نظام عبر
          الإنترنت بشكل مطلق.
        </p>
      </Section>

      <Section title="التغييرات على هذه السياسة">
        <p>
          قد نحدّث هذه السياسة من وقت لآخر، وسننشر النسخة المحدّثة على هذه الصفحة
          مع تاريخ التحديث.
        </p>
      </Section>

      <Section title="تواصل معنا">
        <p>
          لأي استفسار حول الخصوصية، راسلنا على{" "}
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
