import { ADDONS, LENGTHS, SERVICES } from "./catalog";
import { longDate } from "./dates";
import { MAILS, sendMail, siteUrl } from "./mail";
import {
  getBooking, getClient, getGift, getSettings, listBookings, listClients, nextInvoiceNo, PAY_LABEL, saveBooking, saveGift,
  saveInvoice, uid, updateBooking, type Booking, type Invoice, type PayMethod, type Payment,
} from "./store";

const sumPaid = (p?: Payment[]) => (p || []).reduce((t, x) => t + x.amount, 0);
export const bookingDue = (b: Booking) => Math.max(0, (b.final_price ?? b.estimate) - b.gift_used - sumPaid(b.payments));
export const invoiceUrl = (id: string) => `${siteUrl()}/facture/${id}`;

async function seller() {
  const s = await getSettings();
  return { name: s.business_name, legal: s.legal_form, siret: s.siret, address: s.address, email: s.contact_email, vat: s.vat_mention };
}

function bookingLines(b: Booking) {
  const lines: { label: string; amount: number }[] = [];
  for (const id of b.services) { const s = SERVICES.find((x) => x.id === id); if (s) lines.push({ label: `${s.name} · ${longDate(b.date)}`, amount: s.price }); }
  const l = LENGTHS.find((x) => x.id === b.length);
  if (l?.extra && b.services.some((id) => SERVICES.find((x) => x.id === id)?.lengthApplies)) lines.push({ label: `Supplément taille ${l.name}`, amount: l.extra });
  for (const a of b.addons) { const x = ADDONS.find((y) => y.id === a); if (x) lines.push({ label: x.name, amount: x.price }); }
  const gross = lines.reduce((t, x) => t + x.amount, 0);
  const total = b.final_price ?? b.estimate;
  if (total !== gross) lines.push({ label: total < gross ? "Remises (offres, fidélité, codes)" : "Ajustement selon le modèle", amount: total - gross });
  return { lines, total };
}

/** Enregistre un encaissement ; quand tout est réglé, crée la facture et l'envoie par email. */
export async function recordBookingPayment(id: string, items: { method: PayMethod; amount: number; note?: string }[], opts: { markDone?: boolean } = {}) {
  const b = await getBooking(id);
  if (!b) return { error: "Rendez-vous introuvable." };
  const clean = items.filter((i) => i.amount > 0 && PAY_LABEL[i.method]).map((i) => ({ id: uid(), method: i.method, amount: Math.round(i.amount * 100) / 100, at: new Date().toISOString(), note: i.note }));
  let next: Booking = { ...b, payments: [...(b.payments || []), ...clean] };
  if (b.deposit === "due" && clean.length) next.deposit = "paid";
  await saveBooking(next);
  if (opts.markDone && b.status !== "done" && b.status !== "cancelled") { next = (await updateBooking(id, { status: "done" })) || next; }
  if (bookingDue(next) === 0 && !next.invoice) {
    const c = await getClient(next.phone);
    const { lines, total } = bookingLines(next);
    const inv: Invoice = {
      id: uid(14), no: await nextInvoiceNo(new Date().toISOString().slice(0, 4)), date: new Date().toISOString().slice(0, 10), ref: next.id, ref_kind: "booking",
      customer: { name: next.client_name, email: next.email || c?.email || "", phone: next.phone },
      lines, total, paid_with_gift: next.gift_used, payments: (next.payments || []).map((p) => ({ method: PAY_LABEL[p.method], amount: p.amount })), seller: await seller(),
    };
    await saveInvoice(inv);
    next = { ...next, invoice: inv.id };
    await saveBooking(next);
    if (inv.customer.email) { const m = MAILS.invoice(inv.customer.name, inv.no, inv.total, invoiceUrl(inv.id), "prestation"); await sendMail({ ...m, to: inv.customer.email }); }
  }
  return { booking: next, due: bookingDue(next) };
}

/** Active une carte cadeau ou un pack après paiement : facture + envoi du code. */
export async function activateGift(code: string, method: PayMethod) {
  const g = await getGift(code);
  if (!g) return { error: "Carte introuvable." };
  if (g.status === "active") return { gift: g };
  const pay: Payment = { id: uid(), method, amount: g.pay, at: new Date().toISOString() };
  const inv: Invoice = {
    id: uid(14), no: await nextInvoiceNo(new Date().toISOString().slice(0, 4)), date: new Date().toISOString().slice(0, 10), ref: g.code, ref_kind: "gift",
    customer: { name: g.buyer_name, email: g.buyer_email || "", phone: g.buyer_phone },
    lines: [{ label: `${g.label} · code ${g.code} · crédit ${g.credit} €`, amount: g.pay }], total: g.pay, paid_with_gift: 0,
    payments: [{ method: PAY_LABEL[method], amount: g.pay }], seller: await seller(),
  };
  await saveInvoice(inv);
  const next = { ...g, status: "active" as const, payments: [pay], invoice: inv.id };
  await saveGift(next);
  if (g.buyer_email) {
    await sendMail({ ...MAILS.giftActive(g.buyer_name, g.buyer_email, g.code, g.label, g.balance), to: g.buyer_email });
    await sendMail({ ...MAILS.invoice(g.buyer_name, inv.no, inv.total, invoiceUrl(inv.id), g.label), to: g.buyer_email });
  }
  return { gift: next };
}

/** Relances automatiques (lancées chaque matin par Vercel Cron, ou à la main depuis l'espace gérante). */
export async function runAutomations(now = new Date()) {
  const s = await getSettings();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 864e5).toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 864e5).toISOString().slice(0, 10);
  const bookings = await listBookings();
  const clients = await listClients();
  const emailOf = (b: Booking) => b.email || clients.find((c) => c.phone === b.phone)?.email || "";
  let sent = 0;
  const go = async (m: { key: string; kind: string; subject: string; html: string } | null, to: string) => { if (m && to && (await sendMail({ ...m, to }))) sent++; };

  for (const b of bookings) {
    const to = emailOf(b);
    if (!to) continue;
    if (s.auto_reminder && b.status === "confirmed" && b.date === tomorrow) await go(MAILS.reminder(b), to);
    if (s.auto_review && b.status === "done" && b.date <= yesterday && b.date >= new Date(now.getTime() - 7 * 864e5).toISOString().slice(0, 10)) await go(MAILS.review(b), to);
    if (s.auto_rebook && b.status === "done") {
      const due = new Date(new Date(b.date).getTime() + s.rebook_days * 864e5).toISOString().slice(0, 10);
      const hasNext = bookings.some((x) => x.phone === b.phone && x.date > b.date && x.status !== "cancelled");
      if (!hasNext && today >= due && today <= new Date(new Date(due).getTime() + 10 * 864e5).toISOString().slice(0, 10)) await go(MAILS.rebook(b), to);
    }
  }
  if (s.auto_birthday) {
    const month = Number(today.slice(5, 7));
    for (const c of clients) {
      const m = (c.birthday || "").match(/^(\d{1,2})[/.\-](\d{1,2})$/);
      if (c.email && m && Number(m[2]) === month) await go(MAILS.birthday(c.name.replace(/^Exemple · /, ""), c.email, today.slice(0, 4)), c.email);
    }
  }
  return { sent };
}

