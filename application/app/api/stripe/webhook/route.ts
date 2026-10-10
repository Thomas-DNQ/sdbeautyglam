import { NextResponse } from "next/server";
import { verifyStripe } from "@/lib/stripe";
import { activateGift, recordBookingPayment } from "@/lib/billing";

export const dynamic = "force-dynamic";

// À déclarer dans Stripe → Developers → Webhooks : https://votre-site/api/stripe/webhook (événement checkout.session.completed)
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyStripe(raw, req.headers.get("stripe-signature"))) return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  const evt = JSON.parse(raw);
  if (evt.type === "checkout.session.completed") {
    const s = evt.data.object;
    const kind = s.metadata?.kind, ref = s.metadata?.ref;
    if (kind === "gift") await activateGift(ref, "en_ligne");
    if (kind === "booking") await recordBookingPayment(ref, [{ method: "en_ligne", amount: (s.amount_total || 0) / 100, note: s.id }]);
  }
  return NextResponse.json({ received: true });
}
