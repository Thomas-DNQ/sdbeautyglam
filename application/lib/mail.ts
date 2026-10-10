import { BRAND, SERVICES } from "./catalog";
import { hour, longDate } from "./dates";
import { logMail, mailSent, type Booking, type Settings } from "./store";

// Envoi via Resend (https://resend.com) si RESEND_API_KEY est défini, sinon l'email est « simulé » et visible dans l'espace gérante.
export const MAIL_LIVE = !!process.env.RESEND_API_KEY;

export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function layout(title: string, body: string, cta?: { label: string; url: string }) {
  return `<div style="background:#f8f4f0;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#1f1a17">
<div style="max-width:520px;margin:0 auto;background:#fffdfb;border:1px solid #ddd0c6;border-radius:18px;overflow:hidden">
<div style="background:#1f1a17;color:#fffdfb;padding:22px 26px"><div style="font-family:Georgia,serif;font-size:26px;letter-spacing:-1px">SD</div><div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;opacity:.75">Beauty Glam</div></div>
<div style="padding:26px"><h1 style="font-family:Georgia,serif;font-weight:500;font-size:26px;margin:0 0 14px">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#4a403a">${body}</div>
${cta ? `<p style="margin:24px 0 4px"><a href="${cta.url}" style="display:inline-block;background:#1f1a17;color:#fffdfb;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase">${esc(cta.label)}</a></p>` : ""}
</div><div style="padding:16px 26px;border-top:1px solid #ddd0c6;font-size:12px;color:#8c7a70">${BRAND.name} · ${BRAND.city} · @${BRAND.instagram}</div></div></div>`;
}

export async function sendMail(opts: { key: string; kind: string; to: string; subject: string; html: string }) {
  if (!opts.to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(opts.to)) return null;
  if (await mailSent(opts.key)) return null; // jamais deux fois le même email
  let status: "sent" | "simulated" | "failed" = "simulated";
  if (MAIL_LIVE) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.MAIL_FROM || "SD Beauty Glam <onboarding@resend.dev>", to: [opts.to], subject: opts.subject, html: opts.html }),
      });
      status = r.ok ? "sent" : "failed";
    } catch { status = "failed"; }
  }
  return logMail({ key: opts.key, kind: opts.kind, to: opts.to, subject: opts.subject, html: opts.html, status });
}

const what = (b: Booking) => b.services.map((s) => SERVICES.find((x) => x.id === s)?.name || s).join(" + ");

export const MAILS = {
  received: (b: Booking) => ({
    key: `received-${b.id}`, kind: "Demande reçue", subject: `Votre demande du ${longDate(b.date)} est bien reçue`,
    html: layout(`Merci ${b.client_name} !`, `Votre créneau du <b>${longDate(b.date)} à ${hour(b.time)}</b> est bloqué pour <b>${esc(what(b))}</b>.<br>Estimation : <b>${b.estimate} €</b>. Je vous confirme le tarif et l’adresse très vite.`, { label: "Gérer mon rendez-vous", url: `${siteUrl()}/rdv/${b.id}` }),
  }),
  confirmed: (b: Booking, s: Settings) => ({
    key: `confirmed-${b.id}`, kind: "Confirmation", subject: `Rendez-vous confirmé · ${longDate(b.date)} à ${hour(b.time)}`,
    html: layout("C’est confirmé 💅", `Rendez-vous le <b>${longDate(b.date)} à ${hour(b.time)}</b>.<br>Prestation : ${esc(what(b))}<br>Tarif : <b>${b.final_price ?? b.estimate} €</b>${b.deposit === "due" && s.deposit_amount ? `<br><br>Pour valider, merci de régler l’acompte de <b>${s.deposit_amount} €</b>. ${esc(s.deposit_info)}` : ""}`, { label: "Voir mon rendez-vous", url: `${siteUrl()}/rdv/${b.id}` }),
  }),
  reminder: (b: Booking) => ({
    key: `reminder-${b.id}`, kind: "Rappel J-1", subject: `Rappel : vos ongles demain à ${hour(b.time)}`,
    html: layout("À demain !", `Petit rappel de votre rendez-vous <b>demain à ${hour(b.time)}</b>.<br>Pensez à venir sans vernis ni pose d’ailleurs. En cas d’empêchement, prévenez-moi au plus vite.`, { label: "Mon rendez-vous", url: `${siteUrl()}/rdv/${b.id}` }),
  }),
  review: (b: Booking) => ({
    key: `review-${b.id}`, kind: "Demande d’avis", subject: "Vous avez aimé votre pose ?",
    html: layout(`Merci ${b.client_name} 💕`, "Votre avis m’aide énormément à faire connaître mon travail. Ça prend 30 secondes.", { label: "Laisser un avis", url: `${siteUrl()}/rdv/${b.id}` }),
  }),
  rebook: (b: Booking) => ({
    key: `rebook-${b.id}`, kind: "Relance remplissage", subject: "C’est le moment de votre remplissage ✨",
    html: layout("Vos ongles réclament un petit soin", `Votre dernière pose date de quelques semaines. Pour qu’ils restent parfaits, réservez votre prochain rendez-vous en deux minutes.`, { label: "Réserver", url: `${siteUrl()}/reserver` }),
  }),
  birthday: (name: string, email: string, year: string) => ({
    key: `birthday-${email}-${year}`, kind: "Anniversaire", subject: "Joyeux anniversaire 🎂 −10 % ce mois-ci",
    html: layout(`Joyeux anniversaire ${name} !`, "Pour fêter ça, profitez de <b>−10 %</b> sur votre rendez-vous pendant tout le mois. La remise s’applique automatiquement à la réservation.", { label: "Me faire plaisir", url: `${siteUrl()}/reserver` }),
  }),
  invoice: (name: string, no: string, total: number, url: string, ref: string) => ({
    key: `invoice-${no}`, kind: "Facture", subject: `Votre facture ${no} · ${BRAND.name}`,
    html: layout("Merci pour votre confiance", `Vous trouverez votre facture <b>${no}</b> d’un montant de <b>${total} €</b>${ref ? ` (${esc(ref)})` : ""}.<br>Bonne journée ${esc(name)} !`, { label: "Voir ma facture", url }),
  }),
  giftActive: (name: string, email: string, code: string, label: string, balance: number) => ({
    key: `gift-${code}`, kind: "Carte cadeau activée", subject: `Votre ${label} est activée 🎁`,
    html: layout("Votre carte est prête", `Code : <b style="font-size:20px;letter-spacing:2px">${code}</b><br>Crédit disponible : <b>${balance} €</b>.<br>À saisir au moment de réserver, dans « J’ai un code ».`, { label: "Réserver", url: `${siteUrl()}/reserver` }),
  }),
};
