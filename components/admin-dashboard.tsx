"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { BarChart3, BookOpen, CalendarDays, FileText, Image, Lightbulb, MessageSquare, Newspaper, Plus, Settings, Trash2, Users } from "lucide-react";

const modules = [
  ["overview", "نظرة عامة", BarChart3],
  ["content", "المحتوى", Newspaper],
  ["events", "الفعاليات", CalendarDays],
  ["programs", "البرامج والمبادرات", Lightbulb],
  ["library", "التقارير والوثائق", FileText],
  ["media", "الوسائط", Image],
  ["submissions", "المشاركات", MessageSquare],
  ["knowledge", "معرفة المساعد", BookOpen],
  ["users", "المستخدمون والأدوار", Users],
  ["settings", "الإعدادات", Settings],
] as const;
type Tab = (typeof modules)[number][0];
type Row = Record<string, unknown>;

/** Maps each dashboard tab to the real contentType enum value used when creating content_entries. */
const contentTypeByTab: Record<string, string> = { content: "news", events: "announcement", programs: "program", library: "report" };

interface Envelope<T> {
  data: T | null;
  error: { title: string; detail?: string } | null;
}
interface SessionUser {
  id: number;
  email: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
}

async function api<T>(url: string, init?: RequestInit): Promise<Envelope<T>> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = (await r.json()) as Envelope<T>;
  if (!r.ok) throw new Error(body.error?.detail || body.error?.title || "طلب فاشل");
  return body;
}

export function AdminDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<unknown>(null);
  const [status2, setStatus] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    api<SessionUser>("/api/v1/auth/me")
      .then((r) => setMe((r.data as { user: SessionUser } | null)?.user ?? null))
      .catch(() => setMe(null));
    void load("overview");
  }, [status]);

  function endpointFor(next: Tab): string {
    switch (next) {
      case "overview":
        return "/api/v1/admin/dashboard";
      case "content":
      case "events":
      case "programs":
      case "library":
        return `/api/v1/admin/content?type=${contentTypeByTab[next]}&limit=50`;
      case "submissions":
        return "/api/v1/admin/intake?limit=50";
      case "knowledge":
        return "/api/v1/admin/knowledge";
      case "users":
        return "/api/v1/admin/users";
      default:
        return "";
    }
  }

  async function load(next: Tab = tab) {
    const url = endpointFor(next);
    if (!url) return;
    setStatus("جارٍ تحميل البيانات…");
    try {
      const r = await api<unknown>(url);
      setData(r.data);
      setStatus("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "تعذر تحميل البيانات.");
    }
  }

  function choose(next: Tab) {
    setTab(next);
    setData(null);
    void load(next);
  }

  async function createContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setStatus("جارٍ الحفظ…");
    try {
      await api("/api/v1/admin/content", {
        method: "POST",
        body: JSON.stringify({
          contentType: contentTypeByTab[tab] ?? "news",
          canonicalSlug: body.slug,
          title: body.title,
          excerpt: body.excerpt,
          bodyRichtext: body.body,
          category: body.category || undefined,
          status: body.status || "draft",
        }),
      });
      form.reset();
      setStatus("تم الحفظ بنجاح.");
      void load(tab);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "تعذر الحفظ. راجع الحقول.");
    }
  }

  async function createKnowledge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setStatus("جارٍ الحفظ…");
    try {
      await api("/api/v1/admin/knowledge", { method: "POST", body: JSON.stringify({ question: body.question, answer: body.answer }) });
      form.reset();
      setStatus("تم الحفظ بنجاح.");
      void load(tab);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "تعذر الحفظ.");
    }
  }

  async function inviteUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setStatus("جارٍ الحفظ…");
    try {
      await api("/api/v1/admin/users", { method: "POST", body: JSON.stringify({ email: body.email, roleKeys: [body.role || "viewer"] }) });
      form.reset();
      setStatus("تم إرسال الدعوة.");
      void load(tab);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "تعذر الحفظ.");
    }
  }

  async function remove(id: number) {
    if (!confirm("حذف هذا السجل؟ لا يمكن التراجع عن الحذف.")) return;
    try {
      await api(`/api/v1/admin/content/${id}`, { method: "DELETE" });
      setStatus("تم الحذف.");
      void load(tab);
    } catch {
      setStatus("تعذر حذف السجل.");
    }
  }

  async function publish(id: number) {
    try {
      await api(`/api/v1/admin/content/${id}/publish`, { method: "POST", body: JSON.stringify({ action: "publish" }) });
      setStatus("نُشر المحتوى.");
      void load(tab);
    } catch {
      setStatus("تعذر نشر المحتوى.");
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="admin-login" dir="rtl">
        <p>جارٍ التحقق من الجلسة…</p>
      </main>
    );
  }

  const rows = (Array.isArray(data) ? data : []) as Row[];

  return (
    <div className="admin-app" dir="rtl">
      <aside>
        <div className="admin-brand">
          <img src="/eladl-logo.png" alt="" />
          <b>إدارة البوابة</b>
        </div>
        {modules.map(([key, label, Icon]) => (
          <button className={tab === key ? "active" : ""} onClick={() => choose(key)} key={key}>
            <Icon size={17} />
            {label}
          </button>
        ))}
      </aside>
      <section className="admin-main">
        <header>
          <div>
            <p>أمانة ريادة الأعمال المركزية{me ? ` — ${me.email}` : ""}</p>
            <h1>{modules.find((x) => x[0] === tab)?.[1]}</h1>
          </div>
          <button className="admin-logout" onClick={() => signOut({ redirectTo: "/admin/login" })}>
            تسجيل الخروج
          </button>
        </header>
        {status2 && <p className="admin-status">{status2}</p>}
        {tab === "overview" ? (
          <Overview data={data as Row | null} />
        ) : ["content", "events", "programs", "library"].includes(tab) ? (
          <div className="admin-grid">
            <ContentForm onSubmit={createContent} />
            <Rows rows={rows} onRemove={remove} onPublish={publish} />
          </div>
        ) : tab === "settings" ? (
          <SettingsPanel />
        ) : tab === "submissions" ? (
          <div className="admin-grid">
            <section className="admin-empty">
              <h2>المشاركات الواردة</h2>
              <p>تصل هنا الأفكار والمشكلات والمقترحات ورسائل التواصل. تحديث الحالة والتعيين متاح من واجهة /api/v1/admin/intake/:id (لوحة تفصيلية لكل حالة غير مبنية بعد).</p>
            </section>
            <Rows rows={rows} />
          </div>
        ) : tab === "knowledge" ? (
          <div className="admin-grid">
            <form className="admin-form" onSubmit={createKnowledge}>
              <h2>إضافة معرفة للمساعد</h2>
              <label>
                سؤال أو كلمات مفتاحية
                <input name="question" required />
              </label>
              <label>
                الإجابة
                <textarea name="answer" required />
              </label>
              <button>
                <Plus size={16} />
                حفظ
              </button>
            </form>
            <Rows rows={rows} />
          </div>
        ) : tab === "users" ? (
          <div className="admin-grid">
            <form className="admin-form" onSubmit={inviteUser}>
              <h2>دعوة مستخدم إداري</h2>
              <label>
                البريد الإلكتروني
                <input name="email" type="email" required />
              </label>
              <label>
                الدور
                <select name="role" defaultValue="viewer">
                  <option value="super_admin">مدير عام</option>
                  <option value="admin">مدير</option>
                  <option value="editor">محرر</option>
                  <option value="reviewer">مراجع</option>
                  <option value="viewer">مستعرض</option>
                </select>
              </label>
              <button>
                <Plus size={16} />
                حفظ
              </button>
            </form>
            <Rows rows={rows} />
          </div>
        ) : (
          <div className="admin-empty">
            <h2>الوسائط</h2>
            <p>رفع الوسائط عبر رابط موقّع مباشرة إلى AWS S3 متاح من API (`/api/v1/admin/media/sign`، `/confirm`) — واجهة الرفع في لوحة الإدارة غير مبنية بعد.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Overview({ data }: { data: Row | null }) {
  const values = data ? Object.entries(data).filter(([, v]) => typeof v === "number") : [];
  return (
    <div className="admin-overview">
      <div className="metric-grid">
        {values.length
          ? values.map(([key, value]) => (
              <div key={key}>
                <strong>{String(value)}</strong>
                <span>{key}</span>
              </div>
            ))
          : ["طلبات قيد الانتظار", "محتوى مجدول", "تسجيلات قادمة", "فشل إشعارات"].map((key) => (
              <div key={key}>
                <strong>—</strong>
                <span>{key}</span>
              </div>
            ))}
      </div>
    </div>
  );
}

function ContentForm({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="admin-form">
      <h2>إضافة محتوى جديد</h2>
      <label>
        الرابط المختصر
        <input name="slug" required placeholder="my-new-item" />
      </label>
      <label>
        العنوان
        <input name="title" required />
      </label>
      <label>
        التصنيف
        <input name="category" placeholder="مثال: تمويل" />
      </label>
      <label>
        الملخص
        <textarea name="excerpt" required />
      </label>
      <label>
        النص الكامل
        <textarea name="body" required />
      </label>
      <label>
        الحالة
        <select name="status">
          <option value="draft">مسودة</option>
          <option value="published">منشور</option>
        </select>
      </label>
      <button>
        <Plus size={16} />
        حفظ المحتوى
      </button>
    </form>
  );
}

function Rows({ rows, onRemove, onPublish }: { rows: Row[]; onRemove?: (id: number) => void; onPublish?: (id: number) => void }) {
  return (
    <section className="content-table">
      <h2>البيانات الحالية</h2>
      {rows.length ? (
        <table>
          <thead>
            <tr>
              <th>العنوان / الاسم</th>
              <th>النوع / الدور</th>
              <th>الحالة</th>
              {onRemove && <th>إجراء</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.title || row.question || row.name || row.email || "—")}</td>
                <td>{String(row.contentType || row.kind || row.roles || "—")}</td>
                <td>{String(row.status || "—")}</td>
                {onRemove && typeof row.id === "number" && (
                  <td className="row-actions">
                    {row.status !== "published" && <button onClick={() => onPublish?.(row.id as number)}>نشر</button>}
                    <button className="danger" onClick={() => onRemove(row.id as number)} aria-label="حذف">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>لا توجد بيانات حتى الآن.</p>
      )}
    </section>
  );
}

function SettingsPanel() {
  return (
    <div className="admin-empty">
      <h2>إعدادات التشغيل</h2>
      <p>
        المصادقة عبر Auth.js (رابط بريد إلكتروني لمرة واحدة) وقاعدة بيانات PostgreSQL على AWS RDS. تُدار الأدوار والصلاحيات من تبويب
        «المستخدمون والأدوار». لا تُحفظ كلمات مرور أو مفاتيح داخل الكود أو المستودع — جميع الأسرار تُضبط عبر AWS Secrets
        Manager أو SSM Parameter Store.
      </p>
    </div>
  );
}
