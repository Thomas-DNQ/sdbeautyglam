import { NextResponse } from "next/server";
import { addWait, normalizePhone } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 60);
  const phone = normalizePhone(String(b.phone || ""));
  if (!name || phone.length < 9) return NextResponse.json({ error: "Indiquez votre prénom et votre numéro." }, { status: 400 });
  await addWait({ name, phone, wish: String(b.wish || "").slice(0, 200) });
  return NextResponse.json({ ok: true });
}
