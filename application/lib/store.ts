import postgres from "postgres";
import type { Promo } from "./catalog";

// ─────────────── Types ───────────────
export type Slot = { id: string; date: string; time: string; taken: boolean; flash: number };
export type BookingStatus = "pending" | "confirmed" | "done" | "cancelled";
export type Booking = {
  id: string; created_at: string; status: BookingStatus;
  client_name: string; phone: string; instagram: string;
  services: string[]; shape: string; length: string; addons: string[]; design: string;
  estimate: number; final_price: number | null; minutes: number;
  slot_id: string; date: string; time: string; notes: string; has_photo: boolean;
  referral_used: string | null; reward_used: number; promo_code: string | null; birthday: boolean; flash: number;
  gift_code: string | null; gift_used: number; deposit: "none" | "due" | "paid"; cancelled_by?: "client" | "admin";
  email?: string; payments?: Payment[]; invoice?: string | null;
};
export type PayMethod = "especes" | "carte" | "en_ligne" | "virement" | "lydia";
export const PAY_LABEL: Record<PayMethod, string> = { especes: "Espèces", carte: "Carte bancaire", en_ligne: "Carte en ligne", virement: "Virement", lydia: "Lydia / PayPal" };
export type Payment = { id: string; method: PayMethod; amount: number; at: string; note?: string };
export type Client = { phone: string; name: string; instagram: string; stamps: number; referral_code: string; birthday: string; created_at: string; email?: string };
export type Gift = {
  code: string; kind: "card" | "pack"; label: string; pay: number; credit: number; balance: number;
  buyer_name: string; buyer_phone: string; recipient: string; message: string;
  status: "pending" | "active" | "cancelled"; created_at: string;
  buyer_email?: string; payments?: Payment[]; invoice?: string | null;
};
export type Invoice = {
  id: string; no: string; date: string; ref: string; ref_kind: "booking" | "gift";
  customer: { name: string; email: string; phone: string };
  lines: { label: string; amount: number }[]; total: number; paid_with_gift: number; payments: { method: string; amount: number }[];
  seller: { name: string; legal: string; siret: string; address: string; email: string; vat: string };
};
export type Expense = { id: string; date: string; label: string; category: string; amount: number };
export type MailLog = { id: string; key: string; kind: string; to: string; subject: string; html: string; at: string; status: "sent" | "simulated" | "failed" };
export type Wait = { id: string; name: string; phone: string; wish: string; created_at: string; status: "open" | "done" };
export type Review = { id: string; booking_id: string; name: string; rating: number; text: string; approved: boolean; created_at: string };
export type Settings = {
  deposit_amount: number; deposit_info: string; banner: string; owner_whatsapp: string; payment_info: string; popup_code: string;
  business_name: string; legal_form: string; siret: string; address: string; contact_email: string; vat_mention: string;
  urssaf_rate: number; cfp_rate: number; vl_enabled: boolean; vl_rate: number; vat_threshold: number; ca_ceiling: number;
  auto_reminder: boolean; auto_review: boolean; auto_rebook: boolean; auto_birthday: boolean; rebook_days: number;
};

export const DEFAULT_SETTINGS: Settings = {
  deposit_amount: 0,
  deposit_info: "Acompte par Lydia, PayPal ou virement. Les coordonnées vous sont envoyées par message.",
  banner: "",
  owner_whatsapp: process.env.NEXT_PUBLIC_OWNER_WHATSAPP || "",
  payment_info: "Règlement par Lydia, PayPal, virement ou espèces. La carte est activée dès réception du paiement.",
  popup_code: "",
  business_name: "SD Beauty Glam",
  legal_form: "Entrepreneur individuel (micro-entreprise)",
  siret: "",
  address: "Beauregard, 35000 Rennes",
  contact_email: "",
  vat_mention: "TVA non applicable, art. 293 B du CGI",
  urssaf_rate: 21.2, cfp_rate: 0.3, vl_enabled: false, vl_rate: 1.7,
  vat_threshold: 37500, ca_ceiling: 77700,
  auto_reminder: true, auto_review: true, auto_rebook: true, auto_birthday: true, rebook_days: 21,
};

type Coll = "slots" | "bookings" | "clients" | "gifts" | "promos" | "waitlist" | "reviews" | "photos" | "settings" | "invoices" | "expenses" | "mails" | "counters";

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const DEMO = !DB_URL;
/** Module Comptabilité : option payante activée par la variable FEATURE_COMPTA=1 (visible en démo). */
export const COMPTA = process.env.FEATURE_COMPTA === "1" || DEMO;

export function normalizePhone(p: string) {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("0033")) d = "0" + d.slice(4);
  if (d.startsWith("33") && d.length === 11) d = "0" + d.slice(2);
  return d;
}
export const uid = (n = 10) => Array.from({ length: n }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 31)]).join("");
export const codeGen = (prefix: string) => prefix + "-" + uid(6).toUpperCase();

// ─────────────── Stockage : Postgres (documents JSON) ou mémoire (démo) ───────────────
type SQL = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __sql?: SQL; __ready?: Promise<void>; __mem?: Map<string, Map<string, unknown>> };

function sql(): SQL {
  if (!g.__sql) g.__sql = postgres(DB_URL, { ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(DB_URL) ? false : "require", max: 3, idle_timeout: 20, prepare: false });
  return g.__sql;
}
async function ready() {
  if (!g.__ready) g.__ready = (async () => {
    await sql()`create table if not exists sd_docs (coll text not null, id text not null, data jsonb not null, updated_at timestamptz default now(), primary key (coll, id))`;
  })().catch((e) => { g.__ready = undefined; throw e; }); // nouvel essai au prochain appel si la base était injoignable
  return g.__ready;
}
function mem(): Map<string, Map<string, unknown>> {
  if (!g.__mem) { g.__mem = new Map(); seedDemo(g.__mem); }
  return g.__mem;
}
const mcoll = (c: Coll) => { const m = mem(); if (!m.has(c)) m.set(c, new Map()); return m.get(c)!; };
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

async function all<T>(c: Coll): Promise<T[]> {
  if (DEMO) return Array.from(mcoll(c).values()).map((x) => clone(x as T));
  await ready();
  const r = await sql()`select data from sd_docs where coll = ${c}`;
  return r.map((x) => x.data as T);
}
async function get<T>(c: Coll, id: string): Promise<T | null> {
  if (DEMO) { const v = mcoll(c).get(id); return v ? clone(v as T) : null; }
  await ready();
  const r = await sql()`select data from sd_docs where coll = ${c} and id = ${id}`;
  return r[0] ? (r[0].data as T) : null;
}
async function put<T>(c: Coll, id: string, data: T) {
  if (DEMO) { mcoll(c).set(id, clone(data)); return; }
  await ready();
  const s = sql();
  await s`insert into sd_docs (coll, id, data) values (${c}, ${id}, ${s.json(data as never)}) on conflict (coll, id) do update set data = excluded.data, updated_at = now()`;
}
async function del(c: Coll, id: string) {
  if (DEMO) { mcoll(c).delete(id); return; }
  await ready();
  await sql()`delete from sd_docs where coll = ${c} and id = ${id}`;
}
/** Réserve un créneau de façon atomique (deux clientes ne peuvent pas prendre le même). */
async function takeSlot(id: string): Promise<Slot | null> {
  if (DEMO) {
    const s = mcoll("slots").get(id) as Slot | undefined;
    if (!s || s.taken) return null;
    s.taken = true; return clone(s);
  }
  await ready();
  const r = await sql()`update sd_docs set data = jsonb_set(data, '{taken}', 'true') where coll = 'slots' and id = ${id} and (data->>'taken') = 'false' returning data`;
  return r[0] ? (r[0].data as Slot) : null;
}
/** Débite une carte cadeau de façon atomique. */
async function debitGift(code: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  if (DEMO) {
    const gft = mcoll("gifts").get(code) as Gift | undefined;
    if (!gft || gft.status !== "active" || gft.balance < amount) return false;
    gft.balance -= amount; return true;
  }
  await ready();
  const r = await sql()`update sd_docs set data = jsonb_set(data, '{balance}', to_jsonb((data->>'balance')::int - ${amount}))
    where coll = 'gifts' and id = ${code} and data->>'status' = 'active' and (data->>'balance')::int >= ${amount} returning id`;
  return r.length > 0;
}

// ─────────────── Réglages ───────────────
export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await get<Partial<Settings>>("settings", "main")) || {}) };
}
export async function saveSettings(s: Partial<Settings>) {
  const cur = await getSettings();
  await put("settings", "main", { ...cur, ...s });
}

// ─────────────── Créneaux ───────────────
export async function listSlots(from?: string): Promise<Slot[]> {
  const s = (await all<Slot>("slots")).map((x) => ({ ...x, flash: x.flash || 0 }));
  return s.filter((x) => !from || x.date >= from).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
export async function addSlots(items: { date: string; time: string; flash?: number }[]) {
  for (const i of items) {
    const id = `${i.date}_${i.time}`;
    if (!(await get<Slot>("slots", id))) await put<Slot>("slots", id, { id, date: i.date, time: i.time, taken: false, flash: i.flash || 0 });
  }
}
export async function setFlash(id: string, flash: number) {
  const s = await get<Slot>("slots", id);
  if (s) await put("slots", id, { ...s, flash: Math.max(0, Math.round(flash)) });
}
export async function removeSlot(id: string) {
  const s = await get<Slot>("slots", id);
  if (s && !s.taken) await del("slots", id);
}

// ─────────────── Clientes ───────────────
export async function getClient(phone: string) { return get<Client>("clients", normalizePhone(phone)); }
export async function listClients() { return (await all<Client>("clients")).sort((a, b) => b.stamps - a.stamps); }
export async function findByReferral(code: string): Promise<Client | null> {
  const c = (code || "").trim().toUpperCase();
  if (!c) return null;
  return (await all<Client>("clients")).find((x) => x.referral_code === c) || null;
}
export async function upsertClient(name: string, phone: string, instagram: string, birthday: string, email = ""): Promise<Client> {
  const p = normalizePhone(phone);
  const existing = await getClient(p);
  if (existing) {
    const next = { ...existing, instagram: instagram || existing.instagram, birthday: birthday || existing.birthday, email: email || existing.email || "" };
    await put("clients", p, next);
    return next;
  }
  const base = (name.normalize("NFD").replace(/[^a-zA-Z]/g, "").toUpperCase() || "SD").slice(0, 6);
  const c: Client = { phone: p, name, instagram, stamps: 0, referral_code: base + Math.floor(1000 + Math.random() * 9000), birthday, email, created_at: new Date().toISOString() };
  await put("clients", p, c);
  return c;
}
export async function addStamps(phone: string, n: number) {
  const c = await getClient(phone);
  if (c) await put("clients", c.phone, { ...c, stamps: Math.max(0, c.stamps + n) });
}

// ─────────────── Promos ───────────────
export async function listPromos() { return (await all<Promo>("promos")).sort((a, b) => a.code.localeCompare(b.code)); }
export async function savePromo(p: Promo) { await put("promos", p.code, p); }
export async function deletePromo(code: string) { await del("promos", code); }
export async function validPromo(code: string, date: string): Promise<Promo | null> {
  const p = await get<Promo>("promos", (code || "").trim().toUpperCase());
  if (!p || !p.active) return null;
  if (p.starts && date < p.starts) return null;
  if (p.ends && date > p.ends) return null;
  if (p.max_uses && p.uses >= p.max_uses) return null;
  return p;
}

// ─────────────── Cartes cadeaux & packs ───────────────
export async function createGift(g0: Omit<Gift, "code" | "created_at" | "status" | "balance" | "payments" | "invoice">) {
  const gft: Gift = { ...g0, code: codeGen(g0.kind === "pack" ? "PACK" : "SD"), balance: g0.credit, status: "pending", created_at: new Date().toISOString() };
  await put("gifts", gft.code, gft);
  return gft;
}
export async function getGift(code: string) { return get<Gift>("gifts", (code || "").trim().toUpperCase()); }
export async function listGifts() { return (await all<Gift>("gifts")).sort((a, b) => b.created_at.localeCompare(a.created_at)); }
export async function setGiftStatus(code: string, status: Gift["status"]) {
  const gft = await getGift(code);
  if (gft) await put("gifts", gft.code, { ...gft, status });
}
export async function saveGift(g0: Gift) { await put("gifts", g0.code, g0); }
export async function creditGift(code: string, amount: number) {
  const gft = await getGift(code);
  if (gft) await put("gifts", gft.code, { ...gft, balance: gft.balance + amount });
}

// ─────────────── Rendez-vous ───────────────
export async function createBooking(b: Omit<Booking, "id" | "created_at" | "status" | "final_price">, photo: string | null): Promise<Booking | { error: string }> {
  const slot = await takeSlot(b.slot_id);
  if (!slot) return { error: "Ce créneau vient d'être réservé. Choisissez-en un autre." };
  if (b.gift_code && b.gift_used > 0 && !(await debitGift(b.gift_code, b.gift_used))) {
    await put("slots", slot.id, { ...slot, taken: false });
    return { error: "Le solde de la carte cadeau ne suffit plus. Vérifiez le code." };
  }
  const booking: Booking = { ...b, id: uid(12), created_at: new Date().toISOString(), status: "pending", final_price: null };
  await put("bookings", booking.id, booking);
  if (photo) await put("photos", booking.id, { data: photo });
  if (b.promo_code) { const p = await get<Promo>("promos", b.promo_code); if (p) await put("promos", p.code, { ...p, uses: p.uses + 1 }); }
  return booking;
}
export async function getBooking(id: string) { return get<Booking>("bookings", id); }
export async function getPhoto(id: string) { return (await get<{ data: string }>("photos", id))?.data || null; }
export async function listBookings() { return (await all<Booking>("bookings")).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)); }

export async function updateBooking(id: string, patch: Partial<Pick<Booking, "status" | "final_price" | "deposit" | "cancelled_by" | "payments" | "invoice">>) {
  const b = await getBooking(id);
  if (!b) return null;
  if (patch.status === "done" && b.status !== "done") {
    await addStamps(b.phone, 1);
    if (b.referral_used) {
      const sponsor = await findByReferral(b.referral_used);
      if (sponsor && sponsor.phone !== normalizePhone(b.phone)) await addStamps(sponsor.phone, 1);
    }
  }
  if (b.status === "done" && patch.status && patch.status !== "done") await addStamps(b.phone, -1);
  if (patch.status === "cancelled" && b.status !== "cancelled") {
    const s = await get<Slot>("slots", b.slot_id);
    if (s) await put("slots", s.id, { ...s, taken: false });
    if (b.gift_code && b.gift_used) await creditGift(b.gift_code, b.gift_used);
  }
  const next = { ...b, ...patch };
  await put("bookings", id, next);
  return next;
}

// ─────────────── Liste d'attente ───────────────
export async function addWait(w: Omit<Wait, "id" | "created_at" | "status">) { const x: Wait = { ...w, id: uid(), created_at: new Date().toISOString(), status: "open" }; await put("waitlist", x.id, x); return x; }
export async function listWait() { return (await all<Wait>("waitlist")).sort((a, b) => a.created_at.localeCompare(b.created_at)); }
export async function closeWait(id: string) { const w = await get<Wait>("waitlist", id); if (w) await put("waitlist", id, { ...w, status: "done" }); }

// ─────────────── Avis ───────────────
export async function addReview(r: Omit<Review, "id" | "created_at" | "approved">) {
  const exist = (await all<Review>("reviews")).find((x) => x.booking_id === r.booking_id);
  const x: Review = { ...r, id: exist?.id || uid(), created_at: new Date().toISOString(), approved: false };
  await put("reviews", x.id, x); return x;
}
export async function listReviews(onlyApproved = false) {
  const r = (await all<Review>("reviews")).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return onlyApproved ? r.filter((x) => x.approved) : r;
}
export async function setReview(id: string, approved: boolean | null) {
  const r = await get<Review>("reviews", id);
  if (!r) return;
  if (approved === null) await del("reviews", id); else await put("reviews", id, { ...r, approved });
}

// ─────────────── Factures, dépenses, emails ───────────────
export async function nextInvoiceNo(year: string) {
  const c = (await get<{ n: number }>("counters", "inv-" + year)) || { n: 0 };
  const n = c.n + 1;
  await put("counters", "inv-" + year, { n });
  return `FA-${year}-${String(n).padStart(4, "0")}`;
}
export async function saveInvoice(inv: Invoice) { await put("invoices", inv.id, inv); }
export async function getInvoice(id: string) { return get<Invoice>("invoices", id); }
export async function listInvoices() { return (await all<Invoice>("invoices")).sort((a, b) => b.no.localeCompare(a.no)); }
export async function listExpenses() { return (await all<Expense>("expenses")).sort((a, b) => b.date.localeCompare(a.date)); }
export async function addExpense(e: Omit<Expense, "id">) { const x = { ...e, id: uid() }; await put("expenses", x.id, x); return x; }
export async function deleteExpense(id: string) { await del("expenses", id); }
export async function logMail(m: Omit<MailLog, "id" | "at">) { const x: MailLog = { ...m, id: uid(), at: new Date().toISOString() }; await put("mails", x.id, x); return x; }
export async function listMails() { return (await all<MailLog>("mails")).sort((a, b) => b.at.localeCompare(a.at)); }
export async function mailSent(key: string) { return (await all<MailLog>("mails")).some((m) => m.key === key && m.status !== "failed"); }
export async function saveBooking(b: Booking) { await put("bookings", b.id, b); }
export async function saveClient(c: Client) { await put("clients", c.phone, c); }

// ─────────────── Données de démo (mode sans base) ───────────────
function seedDemo(m: Map<string, Map<string, unknown>>) {
  const set = (c: Coll, id: string, v: unknown) => { if (!m.has(c)) m.set(c, new Map()); m.get(c)!.set(id, v); };
  const week: [string, string[]][] = [
    ["2026-10-12", ["15:30", "18:30"]], ["2026-10-15", ["15:30", "18:30"]], ["2026-10-17", ["15:30", "18:30"]],
    ["2026-10-18", ["10:00", "12:30", "15:30"]], ["2026-10-19", ["15:30", "18:30"]], ["2026-10-21", ["15:30"]], ["2026-10-24", ["10:00", "15:30"]],
  ];
  const flashes: Record<string, number> = { "2026-10-15_18:30": 5, "2026-10-21_15:30": 5 };
  for (const [date, times] of week) for (const time of times) { const id = `${date}_${time}`; set("slots", id, { id, date, time, taken: false, flash: flashes[id] || 0 }); }
  const base: Booking = {
    id: "", created_at: new Date().toISOString(), status: "pending", client_name: "", phone: "", instagram: "", services: [], shape: "", length: "", addons: [], design: "",
    estimate: 0, final_price: null, minutes: 120, slot_id: "", date: "", time: "", notes: "", has_photo: false, referral_used: null, reward_used: 0,
    promo_code: null, birthday: false, flash: 0, gift_code: null, gift_used: 0, deposit: "none",
  };
  const bk = (o: Partial<Booking>) => { const b = { ...base, id: uid(12), ...o }; set("bookings", b.id, b); const s = m.get("slots")?.get(b.slot_id) as Slot | undefined; if (s && b.status !== "done") s.taken = true; };
  bk({ client_name: "Exemple · Inès", phone: "0600000001", instagram: "exemple_ines", email: "ines@exemple.fr", services: ["art2"], shape: "almond", length: "M", addons: ["soin"], estimate: 50, slot_id: "2026-10-12_15:30", date: "2026-10-12", time: "15:30", notes: "Chrome rose comme sur la photo" });
  bk({ client_name: "Exemple · Maëva", phone: "0600000002", instagram: "exemple_maeva", email: "maeva@exemple.fr", services: ["rallongement", "pieds-art"], shape: "square", length: "L", estimate: 65, final_price: 65, slot_id: "2026-10-18_10:00", date: "2026-10-18", time: "10:00", status: "confirmed" });
  bk({ client_name: "Exemple · Awa", phone: "0600000003", instagram: "exemple_awa", email: "awa@exemple.fr", services: ["art1"], shape: "coffin", length: "M", addons: ["strass"], estimate: 45, final_price: 45, slot_id: "2026-10-05_15:30", date: "2026-10-05", time: "15:30", status: "done", payments: [{ id: "p1", method: "especes", amount: 45, at: "2026-10-05T17:40:00.000Z" }], invoice: "invdemo0001" });
  // Historique fictif pour illustrer la comptabilité
  const hist: [string, string, number, PayMethod][] = [
    ["2026-07-04", "Exemple · Chloé", 40, "carte"], ["2026-07-12", "Exemple · Inès", 50, "especes"], ["2026-07-26", "Exemple · Maëva", 65, "lydia"],
    ["2026-08-02", "Exemple · Awa", 45, "carte"], ["2026-08-09", "Exemple · Jade", 35, "especes"], ["2026-08-23", "Exemple · Sarah", 55, "en_ligne"], ["2026-08-30", "Exemple · Chloé", 45, "carte"],
    ["2026-09-06", "Exemple · Inès", 50, "carte"], ["2026-09-13", "Exemple · Lina", 70, "en_ligne"], ["2026-09-20", "Exemple · Maëva", 40, "especes"], ["2026-09-27", "Exemple · Jade", 45, "lydia"],
  ];
  hist.forEach(([date, name, amount, method], i) => bk({ client_name: name, phone: "06000001" + String(i).padStart(2, "0"), services: ["art1"], shape: "almond", length: "M", estimate: amount, final_price: amount, slot_id: `${date}_15:30`, date, time: "15:30", status: "done", payments: [{ id: "h" + i, method, amount, at: `${date}T17:00:00.000Z` }] }));
  const cl = (c: Partial<Client>) => set("clients", c.phone!, { instagram: "", birthday: "", created_at: new Date().toISOString(), ...c });
  cl({ phone: "0600000003", name: "Exemple · Awa", instagram: "exemple_awa", stamps: 6, referral_code: "AWA2481", birthday: "14/10", email: "awa@exemple.fr" });
  cl({ phone: "0600000002", name: "Exemple · Maëva", instagram: "exemple_maeva", stamps: 2, referral_code: "MAEVA7310" });
  cl({ phone: "0600000001", name: "Exemple · Inès", instagram: "exemple_ines", stamps: 0, referral_code: "INES5521" });
  set("promos", "HALLOWEEN", { code: "HALLOWEEN", kind: "percent", value: 10, label: "−10 % sur les poses de la semaine d'Halloween", starts: "2026-10-26", ends: "2026-11-01", active: true, public: true, uses: 0, max_uses: 0 });
  set("promos", "BIENVENUE", { code: "BIENVENUE", kind: "amount", value: 5, label: "−5 € sur la première pose", starts: "", ends: "", active: true, public: false, uses: 3, max_uses: 50 });
  set("gifts", "SD-DEMO50", { code: "SD-DEMO50", kind: "card", label: "Carte cadeau 50 €", pay: 50, credit: 50, balance: 50, buyer_name: "Exemple · Léa", buyer_phone: "0600000009", recipient: "Sarah", message: "Joyeux anniversaire !", status: "active", created_at: new Date().toISOString() });
  set("gifts", "PACK-DEMO", { code: "PACK-DEMO", kind: "pack", label: "Pack Glam", pay: 110, credit: 120, balance: 120, buyer_name: "Exemple · Inès", buyer_phone: "0600000001", recipient: "", message: "", status: "pending", created_at: new Date().toISOString() });
  set("settings", "main", { ...DEFAULT_SETTINGS, popup_code: "BIENVENUE", banner: "Halloween : −10 % du 26 octobre au 1er novembre avec le code HALLOWEEN" });
  set("invoices", "invdemo0001", { id: "invdemo0001", no: "FA-2026-0001", date: "2026-10-05", ref: "", ref_kind: "booking", customer: { name: "Exemple · Awa", email: "awa@exemple.fr", phone: "0600000003" },
    lines: [{ label: "Nail art niveau 1 · lundi 5 octobre", amount: 40 }, { label: "Strass & bijoux d'ongle sur 2 doigts", amount: 5 }], total: 45, paid_with_gift: 0, payments: [{ method: "Espèces", amount: 45 }],
    seller: { name: "SD Beauty Glam", legal: DEFAULT_SETTINGS.legal_form, siret: "000 000 000 00000", address: DEFAULT_SETTINGS.address, email: "contact@exemple.fr", vat: DEFAULT_SETTINGS.vat_mention } });
  set("counters", "inv-2026", { n: 1 });
  const ex: [string, string, string, number][] = [["2026-10-02", "Gels et top coat", "Produits", 64.9], ["2026-09-18", "Lampe UV/LED", "Matériel", 89], ["2026-09-03", "Capsules + limes", "Produits", 32.5], ["2026-08-11", "Publicité Instagram", "Marketing", 30]];
  ex.forEach(([date, label, category, amount], i) => set("expenses", "e" + i, { id: "e" + i, date, label, category, amount }));
  set("mails", "m1", { id: "m1", key: "invoice-FA-2026-0001", kind: "Facture", to: "awa@exemple.fr", subject: "Votre facture FA-2026-0001 · SD Beauty Glam", html: "<p>Exemple d'email de facture.</p>", at: "2026-10-05T17:41:00.000Z", status: "simulated" });
  set("waitlist", "w1", { id: "w1", name: "Exemple · Jade", phone: "0600000010", wish: "Un samedi matin", created_at: new Date().toISOString(), status: "open" });
  set("reviews", "r1", { id: "r1", booking_id: "x1", name: "Exemple · Awa", rating: 5, text: "Pose ultra propre et qui tient 4 semaines. Je recommande les yeux fermés.", approved: true, created_at: new Date().toISOString() });
  set("reviews", "r2", { id: "r2", booking_id: "x2", name: "Exemple · Maëva", rating: 5, text: "Très à l'écoute, le rendu est exactement comme mon inspiration.", approved: true, created_at: new Date().toISOString() });
  set("reviews", "r3", { id: "r3", booking_id: "x3", name: "Exemple · Inès", rating: 4, text: "Super moment, je reviens pour le remplissage.", approved: false, created_at: new Date().toISOString() });
}
