import type { Booking } from "./store";
import { SERVICES } from "./catalog";

// Email optionnel à la gérante via Resend (si RESEND_API_KEY + NOTIFY_EMAIL sont définis)
export async function notifyNewBooking(b: Booking) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  const services = b.services.map((id) => SERVICES.find((s) => s.id === id)?.name || id).join(" + ");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "SD Beauty Glam <onboarding@resend.dev>",
        to: [to],
        subject: `Nouvelle demande · ${b.client_name} · ${b.date} ${b.time}`,
        html: `<p><b>${b.client_name}</b> (${b.phone}${b.instagram ? ", @" + b.instagram : ""})</p>
<p>${services}<br/>Forme ${b.shape || "-"} · taille ${b.length || "-"}<br/>Estimation : ${b.estimate} €</p>
<p>${b.notes || ""}</p><p>Ouvrez votre espace gérante pour confirmer.</p>`,
      }),
    });
  } catch {
    /* la réservation reste enregistrée même si l'email échoue */
  }
}
