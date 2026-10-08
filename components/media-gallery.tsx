"use client";
import { useEffect, useState } from "react";
import { EmptyState } from "./page-frame";
type Asset = { id: number; kind: string; title: string; url: string; alt?: string | null };
export function MediaGallery({ kind }: { kind: "image" | "video" }) {
  const [items, setItems] = useState<Asset[]>([]), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false);
  useEffect(() => { fetch(`/api/media?kind=${kind}`).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setItems(data.items || [])).catch(() => setFailed(true)).finally(() => setLoading(false)); }, [kind]);
  if (loading) return <div className="loading-bar" aria-label="جارٍ تحميل الوسائط"/>;
  if (failed) return <div className="inline-error" role="alert">تعذر تحميل الوسائط الآن.</div>;
  if (!items.length) return <EmptyState title={kind === "image" ? "لا توجد صور منشورة بعد" : "لا توجد فيديوهات منشورة بعد"} description="ستظهر المواد المعتمدة من لوحة الإدارة هنا."/>;
  return <div className="media-gallery">{items.map((item) => <article key={item.id} className="media-card">{kind === "image" ? <img src={item.url} alt={item.alt || item.title}/> : <iframe src={item.url} title={item.title} allowFullScreen/>}<h2>{item.title}</h2></article>)}</div>;
}
