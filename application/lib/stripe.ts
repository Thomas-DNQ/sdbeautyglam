import crypto from "crypto";
import { DEMO } from "./store";
import { siteUrl } from "./mail";

// Paiement en ligne par carte via Stripe Checkout (STRIPE_SECRET_KEY). En démo, le paiement est simulé.
export const STRIPE_LIVE = !!process.env.STRIPE_SECRET_KEY;
export const ONLINE_PAY = STRIPE_LIVE || DEMO;

export async function createCheckout(o: { amount: number; label: string; kind: "booking" | "gift"; ref: string; email?: string; back: string }) {
  if (!STRIPE_LIVE) return { url: `/paiement?kind=${o.kind}&ref=${encodeURIComponent(o.ref)}&amount=${o.amount}&label=${encodeURIComponent(o.label)}&back=${encodeURIComponent(o.back)}` };
  const base = siteUrl();
  const p = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(Math.round(o.amount * 100)),
    "line_items[0][price_data][product_data][name]": o.label,
    "metadata[kind]": o.kind,
    "metadata[ref]": o.ref,
    success_url: `${base}${o.back}${o.back.includes("?") ? "&" : "?"}paid=1`,
    cancel_url: `${base}${o.back}`,
    locale: "fr",
  });
  if (o.email) p.set("customer_email", o.email);
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString(),
  });
  const d = await r.json();
  if (!r.ok) return { error: d?.error?.message || "Paiement en ligne indisponible." };
  return { url: d.url as string };
}

/** Vérifie la signature d'un webhook Stripe (en-tête stripe-signature). */
export function verifyStripe(raw: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((x) => x.split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1)); } catch { return false; }
}
