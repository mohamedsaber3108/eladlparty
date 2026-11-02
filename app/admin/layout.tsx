import { SessionProvider } from "next-auth/react";

export const metadata = { title: "لوحة الإدارة | أمانة ريادة الأعمال" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
