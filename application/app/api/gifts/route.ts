import { NextResponse } from "next/server";
import { GIFT_AMOUNTS, PACKS } from "@/lib/catalog";
import { createGift, getGift, getSettings, normalizePhone } from "@/lib/store";
import { ONLINE_PAY } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Vérifier le solde d'une carte
export async function GET(req: Request) {
  const g = await getGift(new URL(req.url).searchParams.get("code") || "");
  if (!g) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, label: g.label, balance: g.balance, status: g.status });
}

// Commander une carte cadeau ou un pack
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 60);
  const phone = normalizePhone(String(b.phone || ""));
  if (!name) return NextResponse.json({ error: "Indiquez votre prénom." }, { status: 400 });
  if (phone.length < 9) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });

  let gift;
  if (b.kind === "pack") {
    const p = PACKS.find((x) => x.id === b.packId);
    if (!p) return NextResponse.json({ error: "Choisissez un pack." }, { status: 400 });
    gift = await createGift({ kind: "pack", label: p.name, pay: p.pay, credit: p.credit, buyer_name: name, buyer_phone: phone, buyer_email: email, recipient: "", message: "" });
  } else {
    const amount = Math.round(Number(b.amount));
    if (!(GIFT_AMOUNTS.includes(amount) || (amount >= 20 && amount <= 300))) return NextResponse.json({ error: "Montant entre 20 et 300 €." }, { status: 400 });
    gift = await createGift({
      kind: "card", label: `Carte cadeau ${amount} €`, pay: amount, credit: amount, buyer_name: name, buyer_phone: phone, buyer_email: email,
      recipient: String(b.recipient || "").slice(0, 60), message: String(b.message || "").slice(0, 300),
    });
  }
  const s = await getSettings();
  return NextResponse.json({ code: gift.code, label: gift.label, pay: gift.pay, credit: gift.credit, payment_info: s.payment_info, online: ONLINE_PAY });
}
