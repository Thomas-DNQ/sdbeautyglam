import { NextResponse } from "next/server";
import { DESIGNS, LOYALTY } from "@/lib/catalog";
import { birthMonth, quote } from "@/lib/pricing";
import { createBooking, getClient, getSettings, normalizePhone, upsertClient } from "@/lib/store";
import { notifyNewBooking } from "@/lib/notify";
import { MAILS, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }

  const name = String(body.name || "").trim().slice(0, 60);
  const phone = normalizePhone(String(body.phone || ""));
  const instagram = String(body.instagram || "").replace(/^@/, "").trim().slice(0, 40);
  const birthday = birthMonth(String(body.birthday || "")) ? String(body.birthday).trim() : "";
  const notes = String(body.notes || "").slice(0, 600);
  const email = String(body.email || "").trim().toLowerCase().slice(0, 120);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  const photo = typeof body.photo === "string" && body.photo.startsWith("data:image/") && body.photo.length < 900_000 ? body.photo : null;
  const design = DESIGNS.some((d) => d.id === body.design) ? String(body.design) : "";

  if (!name) return NextResponse.json({ error: "Indiquez votre prénom." }, { status: 400 });
  if (phone.length < 9) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });

  const q = await quote({
    services: (body.services as string[]) || [], length: String(body.length || ""), addons: ((body.addons as string[]) || []).map(String).slice(0, 10),
    slotId: String(body.slotId || ""), phone, promo: String(body.promo || ""), referral: String(body.referral || ""), giftCode: String(body.giftCode || ""), birthday,
  });
  if (!q.est.lines.length) return NextResponse.json({ error: "Choisissez au moins une prestation." }, { status: 400 });
  if (!q.slot || q.slot.taken) return NextResponse.json({ error: "Ce créneau n'est plus disponible. Choisissez-en un autre." }, { status: 409 });

  await upsertClient(name, phone, instagram, birthday, email);
  const settings = await getSettings();

  const res = await createBooking({
    client_name: name, phone, instagram, services: (body.services as string[]).map(String), shape: String(body.shape || ""), length: String(body.length || ""),
    addons: ((body.addons as string[]) || []).map(String), design, estimate: q.est.total, minutes: q.est.minutes,
    slot_id: q.slot.id, date: q.slot.date, time: q.slot.time, notes, has_photo: !!photo,
    referral_used: q.referral, reward_used: q.reward, promo_code: q.promo?.code || null, birthday: q.birthday, flash: q.slot.flash || 0,
    gift_code: q.gift?.code || null, gift_used: q.est.giftUsed, deposit: settings.deposit_amount > 0 && q.est.toPay > 0 ? "due" : "none",
    email, payments: [], invoice: null,
  }, photo);
  if ("error" in res) return NextResponse.json(res, { status: 409 });
  await notifyNewBooking(res);
  if (email) await sendMail({ ...MAILS.received(res), to: email });
  const client = await getClient(phone);
  return NextResponse.json({
    booking: { id: res.id, date: res.date, time: res.time, estimate: res.estimate, minutes: res.minutes, gift_used: res.gift_used, deposit: res.deposit },
    deposit: { amount: settings.deposit_amount, info: settings.deposit_info },
    lines: q.est.lines,
    client: client ? { stamps: client.stamps, referral_code: client.referral_code, goal: LOYALTY.goal } : null,
  });
}
