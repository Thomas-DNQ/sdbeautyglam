import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminPassword, isAdmin, tokenFor } from "@/lib/auth";
import type { Promo } from "@/lib/catalog";
import { activateGift, bookingDue, recordBookingPayment, runAutomations } from "@/lib/billing";
import { MAILS, MAIL_LIVE, sendMail } from "@/lib/mail";
import { createCheckout, ONLINE_PAY, STRIPE_LIVE } from "@/lib/stripe";
import {
  addExpense, COMPTA, deleteExpense, getBooking, getClient, listExpenses, listInvoices, listMails, PAY_LABEL, type PayMethod,
  addSlots, closeWait, DEMO, deletePromo, getSettings, listBookings, listClients, listGifts, listPromos, listReviews, listSlots, listWait,
  removeSlot, savePromo, saveSettings, setFlash, setGiftStatus, setReview, updateBooking, type BookingStatus,
} from "@/lib/store";

export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Session expirée, reconnectez-vous." }, { status: 401 });
const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

export async function GET() {
  if (!isAdmin()) return unauthorized();
  const [bookings, slots, clients, promos, gifts, waitlist, reviews, settings, invoices, expenses, mails] = await Promise.all([
    listBookings(), listSlots(), listClients(), listPromos(), listGifts(), listWait(), listReviews(), getSettings(),
    listInvoices(), COMPTA ? listExpenses() : Promise.resolve([]), listMails(),
  ]);
  return NextResponse.json({
    demo: DEMO, bookings, slots, clients, promos, gifts, waitlist, reviews, settings, invoices, expenses, mails: mails.slice(0, 200),
    features: { compta: COMPTA, online: ONLINE_PAY, stripe: STRIPE_LIVE, mail: MAIL_LIVE }, methods: PAY_LABEL,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "login") {
    const pw = adminPassword();
    if (!pw || body.password !== pw) return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
    cookies().set(ADMIN_COOKIE, tokenFor(pw), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return NextResponse.json({ ok: true });
  }
  if (action === "logout") { cookies().delete(ADMIN_COOKIE); return NextResponse.json({ ok: true }); }
  if (!isAdmin()) return unauthorized();

  switch (action) {
    case "updateBooking": {
      const status = body.status as BookingStatus | undefined;
      if (status && !["pending", "confirmed", "done", "cancelled"].includes(status)) return bad("Statut inconnu.");
      const fp = body.final_price === undefined || body.final_price === "" || body.final_price === null ? undefined : Math.round(Number(body.final_price));
      const deposit = ["none", "due", "paid"].includes(body.deposit) ? body.deposit : undefined;
      const r = await updateBooking(String(body.id), {
        ...(status ? { status } : {}), ...(fp !== undefined && !Number.isNaN(fp) ? { final_price: fp } : {}),
        ...(deposit ? { deposit } : {}), ...(status === "cancelled" ? { cancelled_by: "admin" as const } : {}),
      });
      if (r && status === "confirmed") { const em = r.email || (await getClient(r.phone))?.email; if (em) await sendMail({ ...MAILS.confirmed(r, await getSettings()), to: em }); }
      return r ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
    }
    case "addSlots": {
      const items = (Array.isArray(body.items) ? body.items : []).filter(
        (i: { date?: string; time?: string }) => /^\d{4}-\d{2}-\d{2}$/.test(i?.date || "") && /^\d{2}:\d{2}$/.test(i?.time || "")
      );
      if (!items.length) return bad("Ajoutez une date et au moins une heure.");
      await addSlots(items);
      return NextResponse.json({ ok: true });
    }
    case "removeSlot": await removeSlot(String(body.id)); return NextResponse.json({ ok: true });
    case "setFlash": await setFlash(String(body.id), Number(body.flash) || 0); return NextResponse.json({ ok: true });
    case "savePromo": {
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      const value = Math.round(Number(body.value));
      if (!code) return bad("Donnez un nom au code (ex : NOEL10).");
      if (!(value > 0) || (body.kind === "percent" && value > 50)) return bad("Valeur invalide (1 à 50 % ou un montant en €).");
      const p: Promo = {
        code, kind: body.kind === "percent" ? "percent" : "amount", value, label: String(body.label || "").slice(0, 120),
        starts: String(body.starts || ""), ends: String(body.ends || ""), active: body.active !== false, public: !!body.public,
        uses: Number(body.uses) || 0, max_uses: Math.max(0, Math.round(Number(body.max_uses) || 0)),
      };
      await savePromo(p);
      return NextResponse.json({ ok: true });
    }
    case "deletePromo": await deletePromo(String(body.code)); return NextResponse.json({ ok: true });
    case "giftStatus": {
      if (!["pending", "active", "cancelled"].includes(body.status)) return bad("Statut inconnu.");
      await setGiftStatus(String(body.code), body.status);
      return NextResponse.json({ ok: true });
    }
    case "pay": {
      const items = (Array.isArray(body.items) ? body.items : []).map((i: { method: PayMethod; amount: number }) => ({ method: i.method, amount: Number(i.amount) || 0 }));
      if (!items.some((i: { amount: number }) => i.amount > 0)) return bad("Indiquez un montant.");
      const r = await recordBookingPayment(String(body.id), items, { markDone: !!body.markDone });
      return "error" in r ? bad(r.error as string) : NextResponse.json({ ok: true, due: r.due, invoice: r.booking.invoice });
    }
    case "payLink": {
      const bk = await getBooking(String(body.id));
      if (!bk) return bad("Rendez-vous introuvable.");
      if (!ONLINE_PAY) return bad("Ajoutez votre clé Stripe pour encaisser par carte en ligne.");
      const due = bookingDue(bk);
      if (due <= 0) return bad("Déjà réglé.");
      return NextResponse.json(await createCheckout({ amount: due, label: `Rendez-vous du ${bk.date} · SD Beauty Glam`, kind: "booking", ref: bk.id, email: bk.email, back: `/rdv/${bk.id}` }));
    }
    case "activateGift": {
      const method = (body.method || "especes") as PayMethod;
      if (!PAY_LABEL[method]) return bad("Moyen de paiement inconnu.");
      const r = await activateGift(String(body.code), method);
      return "error" in r ? bad(r.error as string) : NextResponse.json({ ok: true });
    }
    case "runAutomations": return NextResponse.json(await runAutomations());
    case "addExpense": {
      if (!COMPTA) return bad("Module Comptabilité non activé.");
      const amount = Math.round(Number(String(body.amount).replace(",", ".")) * 100) / 100;
      if (!(amount > 0) || !String(body.label || "").trim()) return bad("Indiquez un libellé et un montant.");
      await addExpense({ date: /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10), label: String(body.label).slice(0, 80), category: String(body.category || "Matériel").slice(0, 40), amount });
      return NextResponse.json({ ok: true });
    }
    case "deleteExpense": if (!COMPTA) return bad("Module Comptabilité non activé."); await deleteExpense(String(body.id)); return NextResponse.json({ ok: true });
    case "closeWait": await closeWait(String(body.id)); return NextResponse.json({ ok: true });
    case "review": await setReview(String(body.id), body.approved === null ? null : !!body.approved); return NextResponse.json({ ok: true });
    case "settings": {
      await saveSettings({
        deposit_amount: Math.max(0, Math.round(Number(body.deposit_amount) || 0)),
        deposit_info: String(body.deposit_info || "").slice(0, 300),
        payment_info: String(body.payment_info || "").slice(0, 300),
        banner: String(body.banner || "").slice(0, 160),
        owner_whatsapp: String(body.owner_whatsapp || "").replace(/\D/g, "").slice(0, 15),
        popup_code: String(body.popup_code || "").trim().toUpperCase().slice(0, 20),
        business_name: String(body.business_name || "").slice(0, 80), legal_form: String(body.legal_form || "").slice(0, 80),
        siret: String(body.siret || "").replace(/[^\d ]/g, "").slice(0, 20), address: String(body.address || "").slice(0, 160),
        contact_email: String(body.contact_email || "").slice(0, 120), vat_mention: String(body.vat_mention || "").slice(0, 120),
        urssaf_rate: Number(body.urssaf_rate) || 0, cfp_rate: Number(body.cfp_rate) || 0, vl_enabled: !!body.vl_enabled, vl_rate: Number(body.vl_rate) || 0,
        vat_threshold: Number(body.vat_threshold) || 0, ca_ceiling: Number(body.ca_ceiling) || 0,
        auto_reminder: !!body.auto_reminder, auto_review: !!body.auto_review, auto_rebook: !!body.auto_rebook, auto_birthday: !!body.auto_birthday,
        rebook_days: Math.max(7, Math.min(60, Number(body.rebook_days) || 21)),
      });
      return NextResponse.json({ ok: true });
    }
  }
  return bad("Action inconnue.");
}
