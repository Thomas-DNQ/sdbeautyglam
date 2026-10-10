import { computeEstimate, LOYALTY, SERVICES } from "./catalog";
import { findByReferral, getClient, getGift, listBookings, listSlots, normalizePhone, validPromo } from "./store";

export type QuoteInput = {
  services: string[]; length?: string; addons: string[]; slotId?: string;
  phone?: string; promo?: string; referral?: string; giftCode?: string; birthday?: string;
};

export function birthMonth(b: string) {
  const m = (b || "").match(/^(\d{1,2})[/.\-](\d{1,2})$/);
  if (!m) return 0;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? month : 0;
}

/** Calcule le prix exact côté serveur (même logique pour l'aperçu et la réservation). */
export async function quote(i: QuoteInput) {
  const services = (i.services || []).filter((id) => SERVICES.some((s) => s.id === id));
  const phone = normalizePhone(i.phone || "");
  const notes: string[] = [];
  const slot = i.slotId ? (await listSlots()).find((s) => s.id === i.slotId) : undefined;
  const date = slot?.date || new Date().toISOString().slice(0, 10);
  const client = phone.length >= 9 ? await getClient(phone) : null;

  // Code promo
  let promo = null;
  if (i.promo?.trim()) {
    promo = await validPromo(i.promo, date);
    if (!promo) notes.push("Ce code promo n'est pas valable pour cette date.");
  }
  // Parrainage (nouvelle cliente uniquement)
  let referral: string | null = null;
  if (i.referral?.trim()) {
    const sponsor = await findByReferral(i.referral);
    if (!sponsor) notes.push("Code parrainage introuvable.");
    else if (client) notes.push("Le parrainage est réservé aux nouvelles clientes.");
    else if (sponsor.phone === phone) notes.push("Vous ne pouvez pas utiliser votre propre code.");
    else referral = sponsor.referral_code;
  }
  // Fidélité : récompense si ce RDV est le 5e ou le 10e
  let reward = 0;
  if (client) {
    const open = (await listBookings()).filter((b) => b.phone === phone && (b.status === "pending" || b.status === "confirmed")).length;
    const nth = client.stamps + open + 1;
    reward = LOYALTY.rewards.find((r) => r.at === nth || (nth > LOYALTY.goal && r.at === LOYALTY.goal && nth % LOYALTY.goal === 0))?.amount || 0;
  }
  // Anniversaire : une fois par an, pendant le mois d'anniversaire
  const bMonth = birthMonth(i.birthday || client?.birthday || "");
  let birthday = false;
  if (bMonth && Number(date.slice(5, 7)) === bMonth) {
    const already = phone ? (await listBookings()).some((b) => b.phone === phone && b.birthday && b.status !== "cancelled" && b.date.slice(0, 4) === date.slice(0, 4)) : false;
    birthday = !already;
  }
  // Carte cadeau / pack
  let gift = null;
  if (i.giftCode?.trim()) {
    gift = await getGift(i.giftCode);
    if (!gift) notes.push("Carte cadeau introuvable.");
    else if (gift.status !== "active") { notes.push("Cette carte n'est pas encore activée (paiement en attente)."); gift = null; }
    else if (gift.balance <= 0) { notes.push("Le solde de cette carte est épuisé."); gift = null; }
  }

  const est = computeEstimate({
    services, length: i.length, addons: i.addons || [], referral: !!referral, loyaltyDiscount: reward,
    flashDiscount: slot?.flash || 0, promo, birthday, giftBalance: gift?.balance || 0,
  });
  return { est, slot, promo, referral, reward, birthday, gift, notes, client };
}
