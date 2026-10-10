import { NextResponse } from "next/server";
import { createCheckout, ONLINE_PAY, STRIPE_LIVE } from "@/lib/stripe";
import { activateGift, bookingDue, recordBookingPayment } from "@/lib/billing";
import { DEMO, getBooking, getClient, getGift, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

// Démarre un paiement en ligne (acompte ou solde d'un RDV, carte cadeau)
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!ONLINE_PAY) return NextResponse.json({ error: "Le paiement en ligne n'est pas activé." }, { status: 400 });

  // Démo uniquement : confirmation du paiement simulé
  if (b.action === "demo-confirm") {
    if (!DEMO || STRIPE_LIVE) return NextResponse.json({ error: "Indisponible." }, { status: 400 });
    if (b.kind === "gift") { const r = await activateGift(String(b.ref), "en_ligne"); return NextResponse.json("error" in r ? r : { ok: true }); }
    const r = await recordBookingPayment(String(b.ref), [{ method: "en_ligne", amount: Number(b.amount) || 0 }]);
    return NextResponse.json("error" in r ? r : { ok: true, due: r.due });
  }

  if (b.kind === "gift") {
    const g = await getGift(String(b.ref));
    if (!g || g.status !== "pending") return NextResponse.json({ error: "Cette carte est déjà réglée ou introuvable." }, { status: 400 });
    return NextResponse.json(await createCheckout({ amount: g.pay, label: `${g.label} · SD Beauty Glam`, kind: "gift", ref: g.code, email: g.buyer_email, back: "/cadeau" }));
  }

  const bk = await getBooking(String(b.ref));
  if (!bk || bk.status === "cancelled") return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  const s = await getSettings();
  const due = bookingDue(bk);
  const amount = b.part === "deposit" && bk.deposit === "due" && s.deposit_amount ? Math.min(due, s.deposit_amount) : due;
  if (amount <= 0) return NextResponse.json({ error: "Ce rendez-vous est déjà réglé." }, { status: 400 });
  const c = await getClient(bk.phone);
  return NextResponse.json(await createCheckout({
    amount, label: `${b.part === "deposit" ? "Acompte" : "Rendez-vous"} du ${bk.date} · SD Beauty Glam`, kind: "booking", ref: bk.id,
    email: bk.email || c?.email, back: b.back === "admin" ? "/admin" : `/rdv/${bk.id}`,
  }));
}
