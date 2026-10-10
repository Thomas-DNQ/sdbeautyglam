import { NextResponse } from "next/server";
import { addReview, getBooking, getSettings, listReviews, PAY_LABEL, updateBooking } from "@/lib/store";
import { bookingDue } from "@/lib/billing";
import { ONLINE_PAY } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function hoursUntil(date: string, time: string) {
  // Heure de Paris approximée (UTC+1/+2) : on garde une marge en prenant UTC+2
  const t = new Date(`${date}T${time}:00+02:00`).getTime();
  return (t - Date.now()) / 36e5;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const b = await getBooking(params.id);
  if (!b) return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  const s = await getSettings();
  const review = (await listReviews()).find((r) => r.booking_id === b.id) || null;
  return NextResponse.json({
    booking: {
      id: b.id, status: b.status, client_name: b.client_name, services: b.services, shape: b.shape, length: b.length, addons: b.addons,
      date: b.date, time: b.time, minutes: b.minutes, estimate: b.estimate, final_price: b.final_price, gift_used: b.gift_used, deposit: b.deposit,
      payments: (b.payments || []).map((p) => ({ label: PAY_LABEL[p.method], amount: p.amount, at: p.at })), invoice: b.invoice || null, due: bookingDue(b),
    },
    online: ONLINE_PAY,
    canCancel: (b.status === "pending" || b.status === "confirmed") && hoursUntil(b.date, b.time) >= 24,
    deposit: { amount: s.deposit_amount, info: s.deposit_info },
    review: review ? { rating: review.rating, text: review.text } : null,
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const b = await getBooking(params.id);
  if (!b) return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (body.action === "cancel") {
    if (!((b.status === "pending" || b.status === "confirmed") && hoursUntil(b.date, b.time) >= 24))
      return NextResponse.json({ error: "L'annulation en ligne n'est plus possible à moins de 24 h. Contactez SD Beauty Glam directement." }, { status: 400 });
    await updateBooking(b.id, { status: "cancelled", cancelled_by: "client" });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "review") {
    if (b.status !== "done") return NextResponse.json({ error: "Vous pourrez laisser un avis après votre rendez-vous." }, { status: 400 });
    const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 0)));
    const text = String(body.text || "").trim().slice(0, 500);
    if (!text) return NextResponse.json({ error: "Écrivez quelques mots sur votre expérience." }, { status: 400 });
    await addReview({ booking_id: b.id, name: b.client_name, rating, text });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
