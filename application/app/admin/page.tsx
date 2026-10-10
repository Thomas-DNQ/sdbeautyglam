import { isAdmin } from "@/lib/auth";
import { DEMO } from "@/lib/store";
import { AdminApp } from "@/components/AdminApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace gérante · SD Beauty Glam", robots: { index: false } };

export default function Page() {
  return <AdminApp initiallyAuthed={isAdmin()} demo={DEMO} />;
}
