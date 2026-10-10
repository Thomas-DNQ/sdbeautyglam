import { NextResponse } from "next/server";
import { getClient, listBookings, listGifts, normalizePhone } from "@/lib/store";
import { LOYALTY } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone") || "");
  if (phone.length < 9) return NextResponse.json({ error: "Numéro invalide." }, { status: 400 });
  const c = await getClient(phone);
  const gifts = (await listGifts()).filter((g) => g.buyer_phone === phone && g.status !== "cancelled").map((g) => ({ code: g.code, label: g.label, balance: g.balance, status: g.status }));
  if (!c) return NextResponse.json({ found: false, gifts });
  const upcoming = (await listBookings())
    .filter((b) => b.phone === phone && (b.status === "pending" || b.status === "confirmed"))
    .map((b) => ({ id: b.id, date: b.date, time: b.time, status: b.status }));
  return NextResponse.json({ found: true, name: c.name, stamps: c.stamps, goal: LOYALTY.goal, referral_code: c.referral_code, upcoming, gifts });
}
