"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<main className="admin-login" dir="rtl" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const sent = params.get("sent") === "1";
  const error = params.get("error") === "1";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("جارٍ إرسال رابط تسجيل الدخول…");
    await signIn("email", { email, redirectTo: "/admin" });
    setStatus("إذا كان هذا البريد مرتبطًا بحساب فريق، سيصلك رابط تسجيل دخول خلال دقائق.");
  }

  return (
    <main className="admin-login" dir="rtl">
      <form onSubmit={submit}>
        <img src="/eladl-logo.png" alt="شعار حزب العدل" />
        <p>لوحة إدارة البوابة</p>
        <h1>دخول الفريق المخوّل</h1>
        <label>
          البريد الإلكتروني
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </label>
        <button>إرسال رابط تسجيل الدخول</button>
        {sent && <p className="admin-status">تحقّق من بريدك الإلكتروني للحصول على رابط تسجيل الدخول (صالح لمدة 15 دقيقة).</p>}
        {error && <p className="admin-status">تعذر تسجيل الدخول. تأكد أن حسابك مُفعّل من فريق الإدارة.</p>}
        {status && <p className="admin-status">{status}</p>}
      </form>
    </main>
  );
}
