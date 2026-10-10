"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Monogram } from "./Header";
import { Modal } from "./Interactive";
import { BusinessSettings, ComptaTab, dueOf, EmailsTab, PayModal, type AExpense, type AInvoice, type AMail, type ASettings, type Pay } from "./AdminExtras";
import { ADDONS, DESIGNS, LOYALTY, SERVICES, SHAPES, type Promo } from "@/lib/catalog";
import { addDays, dayName, dayNum, hour, longDate, monthShort, todayISO } from "@/lib/dates";

type Booking = {
  id: string; created_at: string; status: "pending" | "confirmed" | "done" | "cancelled"; client_name: string; phone: string; instagram: string;
  services: string[]; shape: string; length: string; addons: string[]; design: string; estimate: number; final_price: number | null; minutes: number;
  slot_id: string; date: string; time: string; notes: string; has_photo: boolean; referral_used: string | null; reward_used: number;
  promo_code: string | null; birthday: boolean; flash: number; gift_code: string | null; gift_used: number; deposit: "none" | "due" | "paid"; cancelled_by?: string;
  email?: string; payments?: Pay[]; invoice?: string | null;
};
type Slot = { id: string; date: string; time: string; taken: boolean; flash: number };
type Client = { phone: string; name: string; instagram: string; stamps: number; referral_code: string; birthday: string };
type Gift = { code: string; kind: string; label: string; pay: number; credit: number; balance: number; buyer_name: string; buyer_phone: string; buyer_email?: string; recipient: string; message: string; status: string; created_at: string; payments?: Pay[]; invoice?: string | null };
type Wait = { id: string; name: string; phone: string; wish: string; created_at: string; status: string };
type Review = { id: string; name: string; rating: number; text: string; approved: boolean };
type Settings = { deposit_amount: number; deposit_info: string; banner: string; owner_whatsapp: string; payment_info: string; popup_code: string } & ASettings;
type Data = {
  demo: boolean; bookings: Booking[]; slots: Slot[]; clients: Client[]; promos: Promo[]; gifts: Gift[]; waitlist: Wait[]; reviews: Review[]; settings: Settings;
  invoices: AInvoice[]; expenses: AExpense[]; mails: AMail[]; features: { compta: boolean; online: boolean; stripe: boolean; mail: boolean }; methods: Record<string, string>;
};
type Tab = "home" | "requests" | "planning" | "slots" | "offers" | "shop" | "wait" | "reviews" | "clients" | "emails" | "compta" | "settings";

const STATUS: Record<Booking["status"], string> = { pending: "À confirmer", confirmed: "Confirmé", done: "Terminé", cancelled: "Annulé" };
const svcName = (id: string) => SERVICES.find((s) => s.id === id)?.name || id;
const wa = (p: string, text: string) => `https://wa.me/${p.startsWith("0") ? "33" + p.slice(1) : p}?text=${encodeURIComponent(text)}`;
const price = (b: Booking) => b.final_price ?? b.estimate;
const QUICK_TIMES = ["10:00", "12:30", "15:30", "18:30"];
const photoSrc = (id: string) => (globalThis as unknown as { __sdPhoto?: (id: string) => string | undefined }).__sdPhoto?.(id) || `/api/admin/photo/${id}`;
const emptyPromo: Promo = { code: "", kind: "percent", value: 10, label: "", starts: "", ends: "", active: true, public: true, uses: 0, max_uses: 0 };

export function AdminApp({ initiallyAuthed, demo }: { initiallyAuthed: boolean; demo: boolean }) {
  const [authed, setAuthed] = useState(initiallyAuthed);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [zoom, setZoom] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [newDate, setNewDate] = useState(addDays(todayISO(), 1));
  const [newTimes, setNewTimes] = useState<string[]>(["15:30"]);
  const [customTime, setCustomTime] = useState("");
  const [newFlash, setNewFlash] = useState(0);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toast, setToast] = useState("");
  const [payFor, setPayFor] = useState<Booking | null>(null);
  const [giftMethod, setGiftMethod] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const load = useCallback(async () => {
    const r = await fetch("/api/admin", { cache: "no-store" });
    if (r.status === 401) { setAuthed(false); return; }
    const d = await r.json();
    setData(d); setSettings((s) => s || d.settings);
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function act(body: Record<string, unknown>, msg?: string) {
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { flash(d.error || "L’action n’a pas abouti."); if (r.status === 401) setAuthed(false); return false; }
    if (msg) flash(msg);
    await load();
    return true;
  }

  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const bs = data?.bookings || [];
  const pending = useMemo(() => bs.filter((b) => b.status === "pending").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [bs]);
  const upcoming = useMemo(() => bs.filter((b) => b.status === "confirmed").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [bs]);
  const past = useMemo(() => bs.filter((b) => b.status === "done" || b.status === "cancelled"), [bs]);
  const forTomorrow = upcoming.filter((b) => b.date === tomorrow);
  const todayList = upcoming.filter((b) => b.date === today);
  const giftsPending = (data?.gifts || []).filter((g) => g.status === "pending");
  const waitOpen = (data?.waitlist || []).filter((w) => w.status === "open");
  const reviewsPending = (data?.reviews || []).filter((r) => !r.approved);
  const slotDays = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of (data?.slots || []).filter((s) => s.date >= today)) m.set(s.date, [...(m.get(s.date) || []), s]);
    return Array.from(m.entries());
  }, [data, today]);

  const stats = useMemo(() => {
    const month = today.slice(0, 7);
    const valid = bs.filter((b) => b.status !== "cancelled");
    const isMain = (s: string) => SERVICES.find((x) => x.id === s)?.cat === "mains";
    const isFeet = (s: string) => SERVICES.find((x) => x.id === s)?.cat === "pieds";
    const upsold = valid.filter((b) => b.addons.length || (b.services.some(isMain) && b.services.some(isFeet)));
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const end = addDays(today, 7 - i * 7), start = addDays(end, -7);
      return { label: `${dayNum(addDays(start, 1))} ${monthShort(addDays(start, 1))}`, value: valid.filter((b) => b.date > start && b.date <= end).reduce((t, b) => t + price(b), 0) };
    }).reverse();
    return {
      done: bs.filter((b) => b.status === "done" && b.date.startsWith(month)).reduce((t, b) => t + price(b), 0),
      booked: valid.filter((b) => b.date.startsWith(month)).reduce((t, b) => t + price(b), 0),
      count: valid.length,
      avg: valid.length ? Math.round(valid.reduce((t, b) => t + price(b), 0) / valid.length) : 0,
      upsell: valid.length ? Math.round((upsold.length / valid.length) * 100) : 0,
      giftsSold: (data?.gifts || []).filter((g) => g.status === "active").reduce((t, g) => t + g.pay, 0),
      referrals: valid.filter((b) => b.referral_used).length,
      promos: valid.filter((b) => b.promo_code).length,
      weeks,
    };
  }, [bs, data, today]);

  const storyText = useMemo(() => {
    const lines = slotDays.slice(0, 7).map(([d, ss]) => {
      const free = ss.filter((s) => !s.taken).map((s) => hour(s.time) + (s.flash ? ` (−${s.flash} €)` : ""));
      return `${dayName(d)[0].toUpperCase() + dayName(d).slice(1)} ${dayNum(d)} ${monthShort(d)} : ${free.length ? free.join(" · ") : "complet"}`;
    });
    return lines.length ? `✨ Mes disponibilités ✨\n\n${lines.join("\n")}\n\nRéservation en ligne 👉 ${origin}/reserver` : "";
  }, [slotDays, origin]);

  if (!authed) {
    return (
      <main className="book">
        <div className="wrap narrow step-anim" style={{ maxWidth: 420 }}>
          <Monogram />
          <h1 className="display" style={{ marginTop: 32 }}>Espace gérante</h1>
          <form style={{ marginTop: 20 }} onSubmit={async (e) => {
            e.preventDefault(); setErr("");
            const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password: pw }) });
            if (r.ok) setAuthed(true); else setErr("Mot de passe incorrect.");
          }}>
            <div className="field"><label htmlFor="pw">Mot de passe</label><input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></div>
            <button className="btn block" type="submit">Se connecter</button>
            {err && <p className="err">{err}</p>}
            {demo && <p className="muted small" style={{ marginTop: 14 }}>Mode démo : le mot de passe est <b>demo</b>.</p>}
          </form>
        </div>
      </main>
    );
  }

  const BookingCard = ({ b }: { b: Booking }) => {
    const link = `${origin}/rdv/${b.id}`;
    const confirmMsg = `Bonjour ${b.client_name} ! C’est SD Beauty Glam 💅 Votre rendez-vous du ${longDate(b.date)} à ${hour(b.time)} est confirmé. Tarif : ${prices[b.id] || price(b)} €.${b.deposit === "due" && data?.settings.deposit_amount ? ` Pour valider, merci de régler l’acompte de ${data.settings.deposit_amount} €.` : ""} Gérer votre RDV : ${link}`;
    const remindMsg = `Bonjour ${b.client_name} ! Petit rappel de votre rendez-vous SD Beauty Glam le ${longDate(b.date)} à ${hour(b.time)} 💅 À très vite !`;
    const reviewMsg = `Merci ${b.client_name} pour votre visite 💕 Si vous avez 30 secondes, votre avis m’aide énormément : ${link}`;
    const design = DESIGNS.find((d) => d.id === b.design);
    return (
      <div className={`bk ${b.status}`}>
        <div className="when">
          <small>{dayName(b.date).slice(0, 3)}</small><b>{dayNum(b.date)}</b><small>{monthShort(b.date)}</small>
          <div style={{ fontWeight: 600, marginTop: 6 }}>{hour(b.time)}</div>
        </div>
        <div className="body">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: "1.05rem" }}>{b.client_name}</b> <span className={`pill ${b.status}`}>{STATUS[b.status]}</span>
              {b.deposit === "due" && b.status !== "cancelled" && <span className="pill pending" style={{ marginLeft: 4 }}>Acompte dû</span>}
              {b.deposit === "paid" && <span className="pill confirmed" style={{ marginLeft: 4 }}>Acompte reçu</span>}
              {b.status !== "cancelled" && !!(b.payments || []).length && (dueOf(b) === 0 ? <span className="pill confirmed" style={{ marginLeft: 4 }}>Payé</span> : <span className="pill pending" style={{ marginLeft: 4 }}>Reste {dueOf(b)} €</span>)}
              {b.status === "done" && !(b.payments || []).length && dueOf(b) > 0 && <span className="pill cancelled" style={{ marginLeft: 4 }}>Non encaissé</span>}
              <div className="muted small">{b.phone}{b.instagram && ` · @${b.instagram}`}</div>
            </div>
            <div className="h3 num">{price(b)} €{b.final_price === null && <span className="muted small" style={{ fontFamily: "var(--body)", fontWeight: 400 }}> estim.</span>}</div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            {b.has_photo && <img className="bk-thumb" src={photoSrc(b.id)} alt="Inspiration de la cliente" onClick={() => setZoom(photoSrc(b.id))} />}
            {!b.has_photo && design && <img className="bk-thumb" src={design.img} alt={design.name} onClick={() => setZoom(design.img)} />}
            <div className="small" style={{ minWidth: 0 }}>
              <div>{b.services.map(svcName).join(" + ")}{design && <span className="muted"> · modèle {design.name}</span>}</div>
              {b.shape && <div className="muted">{SHAPES.find((s) => s.id === b.shape)?.name}{b.length ? ` · ${b.length}` : ""} · {b.minutes} min</div>}
              {!!b.addons.length && <div className="muted">Options : {b.addons.map((a) => ADDONS.find((x) => x.id === a)?.name || a).join(", ")}</div>}
              {[b.promo_code && `Code ${b.promo_code}`, b.flash && `Flash −${b.flash} €`, b.birthday && "Anniversaire", b.referral_used && `Parrainée par ${b.referral_used}`, b.reward_used && `Fidélité −${b.reward_used} €`, b.gift_code && `Carte ${b.gift_code} −${b.gift_used} €`].filter(Boolean).length > 0 && (
                <div className="tags" style={{ marginTop: 4 }}>
                  {[b.promo_code && `Code ${b.promo_code}`, b.flash ? `Flash −${b.flash} €` : "", b.birthday && "Anniversaire", b.referral_used && `Parrainage ${b.referral_used}`, b.reward_used ? `Fidélité −${b.reward_used} €` : "", b.gift_code && `Carte −${b.gift_used} €`].filter(Boolean).map((t) => <span key={String(t)}>{t}</span>)}
                </div>
              )}
              {b.notes && <div style={{ marginTop: 4, fontStyle: "italic" }}>« {b.notes} »</div>}
              {b.cancelled_by === "client" && <div className="muted">Annulé par la cliente</div>}
            </div>
          </div>
          <div className="bk-actions">
            {b.status === "pending" && (
              <>
                <input className="price-in" inputMode="numeric" aria-label="Tarif final en euros" placeholder={`${b.estimate} €`} value={prices[b.id] || ""} onChange={(e) => setPrices({ ...prices, [b.id]: e.target.value.replace(/\D/g, "") })} />
                <button className="btn sm" onClick={() => act({ action: "updateBooking", id: b.id, status: "confirmed", final_price: prices[b.id] || b.estimate }, "Rendez-vous confirmé")}>Confirmer</button>
                <a className="btn ghost sm" href={wa(b.phone, confirmMsg)} target="_blank" rel="noreferrer">WhatsApp</a>
              </>
            )}
            {(b.status === "confirmed" || b.status === "done") && dueOf(b) > 0 && <button className="btn sm" onClick={() => setPayFor(b)}>Encaisser {dueOf(b)} €</button>}
            {b.invoice && <a className="btn ghost sm" href={`/facture/${b.invoice}`} target="_blank" rel="noreferrer">Facture</a>}
            {b.status === "confirmed" && (
              <>
                <button className="btn ghost sm" onClick={() => act({ action: "updateBooking", id: b.id, status: "done" }, "Terminé · tampon ajouté")}>Terminé +1 tampon</button>
                <a className="btn ghost sm" href={wa(b.phone, remindMsg)} target="_blank" rel="noreferrer">Rappel</a>
              </>
            )}
            {b.deposit === "due" && (b.status === "pending" || b.status === "confirmed") && (
              <button className="btn ghost sm" onClick={() => act({ action: "updateBooking", id: b.id, deposit: "paid" }, "Acompte noté")}>Acompte reçu</button>
            )}
            {(b.status === "pending" || b.status === "confirmed") && <button className="btn ghost sm" onClick={() => act({ action: "updateBooking", id: b.id, status: "cancelled" }, "Annulé · créneau libéré")}>Annuler</button>}
            {b.status === "done" && <a className="btn ghost sm" href={wa(b.phone, reviewMsg)} target="_blank" rel="noreferrer">Demander un avis</a>}
          </div>
        </div>
      </div>
    );
  };

  const tabs: [Tab, string, number][] = [
    ["home", "Aujourd’hui", 0], ["requests", "Demandes", pending.length], ["planning", "Planning", upcoming.length], ["slots", "Dispos", 0],
    ["offers", "Offres", 0], ["shop", "Boutique", giftsPending.length], ["wait", "Attente", waitOpen.length], ["reviews", "Avis", reviewsPending.length],
    ["clients", "Clientes", 0], ["emails", "Emails", 0], ["compta", data?.features.compta ? "Comptabilité" : "Comptabilité 🔒", 0], ["settings", "Réglages", 0],
  ];
  const maxWeek = Math.max(1, ...stats.weeks.map((w) => w.value));

  return (
    <main className="admin">
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <Monogram />
          <div className="btn-row">
            <a className="btn ghost sm" href="/" target="_blank" rel="noreferrer">Voir le site</a>
            <button className="btn ghost sm" onClick={async () => { await act({ action: "logout" }); setAuthed(false); }}>Déconnexion</button>
          </div>
        </div>
        {data?.demo && <p className="demo-banner" style={{ marginTop: 16 }}>Mode démo : les éléments marqués « Exemple » sont fictifs et rien n’est sauvegardé. Branchez la base de données pour passer en réel.</p>}

        <div className="tabs" role="tablist">
          {tabs.map(([id, label, n]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
              {label}{n ? <span className="badge">{n}</span> : null}
            </button>
          ))}
        </div>

        {!data && <div className="kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}</div>}

        {data && (
          <div key={tab} className="step-anim">
            {tab === "home" && (
              <>
                <h1 className="h2" style={{ marginBottom: 18 }}>Bonjour 💅</h1>
                <div className="kpis">
                  <div className="kpi"><small>À confirmer</small><b>{pending.length}</b><small>demandes</small></div>
                  <div className="kpi"><small>Prévu ce mois</small><b>{stats.booked} €</b><small>{stats.done} € déjà encaissés</small></div>
                  <div className="kpi"><small>Panier moyen</small><b>{stats.avg} €</b><small>{stats.count} réservations en ligne</small></div>
                  <div className="kpi"><small>Avec option ou duo</small><b>{stats.upsell} %</b><small>des rendez-vous</small></div>
                </div>
                {(todayList.length > 0 || forTomorrow.length > 0) && (
                  <div className="tomorrow">
                    <div className="eyebrow" style={{ color: "var(--nude)" }}>{todayList.length ? "Aujourd’hui" : "Demain · pensez au rappel"}</div>
                    {(todayList.length ? todayList : forTomorrow).map((b) => (
                      <div key={b.id} className="row-line" style={{ borderColor: "rgba(255,253,251,.15)" }}>
                        <span><b>{hour(b.time)}</b> · {b.client_name} · {b.services.map(svcName).join(" + ")}</span>
                        <a className="btn sm" href={wa(b.phone, `Bonjour ${b.client_name} ! Petit rappel de votre rendez-vous SD Beauty Glam ${todayList.length ? "aujourd’hui" : "demain"} à ${hour(b.time)} 💅`)} target="_blank" rel="noreferrer">Rappel WhatsApp</a>
                      </div>
                    ))}
                  </div>
                )}
                <div className="admin-grid">
                  <div className="panel">
                    <div className="h3">Chiffre d’affaires par semaine</div>
                    <div className="bar-chart" style={{ marginTop: 28, marginBottom: 24 }}>
                      {stats.weeks.map((w) => <div key={w.label} style={{ height: `${(w.value / maxWeek) * 100}%` }}><em>{w.value ? `${w.value} €` : ""}</em><span>{w.label}</span></div>)}
                    </div>
                  </div>
                  <div className="panel">
                    <div className="h3">À traiter</div>
                    {[
                      [pending.length, "demande(s) à confirmer", "requests"],
                      [giftsPending.length, "carte(s) cadeau à activer", "shop"],
                      [waitOpen.length, "personne(s) en liste d’attente", "wait"],
                      [reviewsPending.length, "avis à valider", "reviews"],
                    ].map(([n, l, t]) => (
                      <div className="row-line" key={String(t)}><span><b>{n}</b> {l}</span>{Number(n) > 0 && <button className="btn ghost sm" onClick={() => setTab(t as Tab)}>Voir</button>}</div>
                    ))}
                    <div className="row-line"><span className="muted small">Cartes & packs vendus : {stats.giftsSold} € · {stats.promos} codes promo utilisés · {stats.referrals} parrainages</span></div>
                  </div>
                </div>
              </>
            )}

            {tab === "requests" && (<>{!pending.length && <p className="muted">Aucune demande en attente. Les nouvelles réservations apparaissent ici.</p>}{pending.map((b) => <BookingCard key={b.id} b={b} />)}</>)}

            {tab === "planning" && (
              <>
                {!upcoming.length && <p className="muted">Aucun rendez-vous confirmé à venir.</p>}
                {upcoming.map((b) => <BookingCard key={b.id} b={b} />)}
                {!!past.length && <div className="eyebrow" style={{ margin: "28px 0 12px" }}>Historique</div>}
                {past.slice(0, 30).map((b) => <BookingCard key={b.id} b={b} />)}
              </>
            )}

            {tab === "slots" && (
              <>
                <div className="panel" style={{ marginBottom: 20 }}>
                  <div className="h3" style={{ marginBottom: 12 }}>Ouvrir des créneaux</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <input id="slot-date" type="date" className="input" style={{ width: "auto" }} value={newDate} min={today} onChange={(e) => setNewDate(e.target.value)} />
                    {QUICK_TIMES.map((t) => (
                      <button key={t} type="button" className={`chip opt ${newTimes.includes(t) ? "on" : ""}`} onClick={() => setNewTimes(newTimes.includes(t) ? newTimes.filter((x) => x !== t) : [...newTimes, t])}>{hour(t)}</button>
                    ))}
                    <input id="slot-custom" type="time" className="input" style={{ width: "auto" }} value={customTime} onChange={(e) => setCustomTime(e.target.value)} aria-label="Autre heure" />
                  </div>
                  <label className="switch" style={{ marginTop: 12 }}>
                    <input type="checkbox" checked={newFlash > 0} onChange={(e) => setNewFlash(e.target.checked ? 5 : 0)} /> Créneau flash (−5 €) pour remplir plus vite
                  </label>
                  <div><button className="btn sm" style={{ marginTop: 14 }} onClick={async () => {
                    const times = Array.from(new Set([...newTimes, ...(customTime ? [customTime] : [])]));
                    if (await act({ action: "addSlots", items: times.map((time) => ({ date: newDate, time, flash: newFlash })) }, "Créneaux ajoutés")) {
                      setCustomTime(""); setNewDate(addDays(newDate, 1));
                    }
                  }}>Ajouter le {longDate(newDate)}</button></div>
                </div>
                {!slotDays.length && <p className="muted">Aucun créneau ouvert. Ajoutez-en ci-dessus pour que les clientes puissent réserver.</p>}
                {slotDays.map(([d, ss]) => (
                  <div className="slot-day" key={d}>
                    <div className="d"><b>{longDate(d)}</b></div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {ss.map((s) => (
                        <span key={s.id} className={`chip ${s.taken ? "taken" : ""}`}>
                          {hour(s.time)}{s.flash ? ` · −${s.flash} €` : ""}
                          {s.taken ? " · réservé" : (
                            <>
                              <button title={s.flash ? "Retirer le flash" : "Passer en flash −5 €"} aria-label="Basculer créneau flash" onClick={() => act({ action: "setFlash", id: s.id, flash: s.flash ? 0 : 5 }, s.flash ? "Flash retiré" : "Créneau passé en flash")}>⚡</button>
                              <button aria-label={`Supprimer ${hour(s.time)}`} onClick={() => act({ action: "removeSlot", id: s.id }, "Créneau supprimé")}>×</button>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {storyText && (
                  <div className="panel" style={{ marginTop: 24 }}>
                    <div className="h3">Texte pour votre story</div>
                    <p className="muted small" style={{ margin: "4px 0 10px" }}>Vos dispos à jour avec le lien de réservation.</p>
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--body)", fontSize: ".9rem", background: "var(--ivory)", padding: 14, borderRadius: 10, margin: 0 }}>{storyText}</pre>
                    <button className="btn sm" style={{ marginTop: 12 }} onClick={async () => { try { await navigator.clipboard.writeText(storyText); flash("Texte copié"); } catch { flash("Sélectionnez le texte pour le copier"); } }}>Copier</button>
                  </div>
                )}
              </>
            )}

            {tab === "offers" && settings && (
              <>
                <div className="admin-grid" style={{ marginBottom: 16 }}>
                  <div className="panel">
                    <div className="h3">Bandeau défilant</div>
                    <p className="muted small">Le message en haut du site (ex : offre du moment).</p>
                    <input id="set-banner" className="input" value={settings.banner} onChange={(e) => setSettings({ ...settings, banner: e.target.value })} placeholder="Ex : −10 % toute la semaine avec le code NOEL10" />
                  </div>
                  <div className="panel">
                    <div className="h3">Pop-up de bienvenue</div>
                    <p className="muted small">Code affiché aux nouvelles visiteuses après quelques secondes. Laissez vide pour désactiver.</p>
                    <select id="set-popup" className="input" value={settings.popup_code} onChange={(e) => setSettings({ ...settings, popup_code: e.target.value })}>
                      <option value="">Désactivé</option>
                      {data.promos.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.label || `−${p.value}${p.kind === "percent" ? " %" : " €"}`}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn sm" onClick={() => act({ action: "settings", ...settings }, "Offres mises à jour")}>Enregistrer</button>

                <div className="section-head" style={{ marginTop: 32, marginBottom: 12 }}>
                  <div className="h3">Codes promo</div>
                  <button className="btn sm" onClick={() => setPromo({ ...emptyPromo })}>Nouveau code</button>
                </div>
                <div className="panel">
                  {!data.promos.length && <p className="muted" style={{ margin: 0 }}>Aucun code. Créez-en un pour une fête, un creux de planning ou une collab.</p>}
                  {data.promos.map((p) => (
                    <div className="row-line" key={p.code}>
                      <div>
                        <b>{p.code}</b> <span className={`pill ${p.active ? "confirmed" : "cancelled"}`}>{p.active ? "Actif" : "Inactif"}</span> {p.public && <span className="pill done">Affiché sur le site</span>}
                        <div className="muted small">−{p.value}{p.kind === "percent" ? " %" : " €"} · {p.label || "sans description"}{p.starts || p.ends ? ` · ${p.starts || "…"} → ${p.ends || "…"}` : ""} · utilisé {p.uses}{p.max_uses ? `/${p.max_uses}` : ""} fois</div>
                      </div>
                      <div className="btn-row">
                        <button className="btn ghost sm" onClick={() => setPromo({ ...p })}>Modifier</button>
                        <button className="btn ghost sm" onClick={() => act({ action: "deletePromo", code: p.code }, "Code supprimé")}>Supprimer</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "shop" && (
              <div className="panel">
                {!data.gifts.length && <p className="muted" style={{ margin: 0 }}>Les commandes de cartes cadeaux et de packs apparaissent ici.</p>}
                {data.gifts.map((g) => (
                  <div className="row-line" key={g.code}>
                    <div>
                      <b>{g.label}</b> <code>{g.code}</code> <span className={`pill ${g.status === "active" ? "confirmed" : g.status === "pending" ? "pending" : "cancelled"}`}>{g.status === "active" ? `Active · ${g.balance} €` : g.status === "pending" ? "Paiement à recevoir" : "Annulée"}</span>
                      <div className="muted small">{g.buyer_name} · {g.buyer_phone} · à payer {g.pay} € → crédit {g.credit} €{g.recipient ? ` · pour ${g.recipient}` : ""}{g.message ? ` · « ${g.message} »` : ""}</div>
                    </div>
                    <div className="btn-row">
                      {g.status === "pending" && (
                        <>
                          <select className="input" style={{ width: "auto", padding: "8px 10px" }} aria-label="Moyen de paiement" value={giftMethod[g.code] || "especes"} onChange={(e) => setGiftMethod({ ...giftMethod, [g.code]: e.target.value })}>
                            {Object.entries(data.methods).filter(([k]) => k !== "en_ligne").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </select>
                          <button className="btn sm" onClick={() => act({ action: "activateGift", code: g.code, method: giftMethod[g.code] || "especes" }, "Carte activée · facture créée")}>Encaisser et activer</button>
                        </>
                      )}
                      {g.invoice && <a className="btn ghost sm" href={`/facture/${g.invoice}`} target="_blank" rel="noreferrer">Facture</a>}
                      {g.status === "active" && <a className="btn ghost sm" href={wa(g.buyer_phone, `Bonjour ${g.buyer_name} ! Votre ${g.label} SD Beauty Glam est activée 🎁 Code : ${g.code} · crédit ${g.balance} €. Réservez ici : ${origin}/reserver`)} target="_blank" rel="noreferrer">Envoyer le code</a>}
                      {g.status === "pending" && <button className="btn ghost sm" onClick={() => act({ action: "giftStatus", code: g.code, status: "cancelled" }, "Commande annulée")}>Annuler</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "wait" && (
              <div className="panel">
                {!waitOpen.length && <p className="muted" style={{ margin: 0 }}>Personne en liste d’attente.</p>}
                {waitOpen.map((w) => (
                  <div className="row-line" key={w.id}>
                    <div><b>{w.name}</b> · {w.phone}<div className="muted small">{w.wish || "Pas de préférence"} · inscrite le {longDate(w.created_at.slice(0, 10))}</div></div>
                    <div className="btn-row">
                      <a className="btn sm" href={wa(w.phone, `Bonjour ${w.name} ! Une place vient de se libérer chez SD Beauty Glam 💅 Réservez vite ici : ${origin}/reserver`)} target="_blank" rel="noreferrer">Prévenir</a>
                      <button className="btn ghost sm" onClick={() => act({ action: "closeWait", id: w.id }, "Retirée de la liste")}>Retirer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "reviews" && (
              <div className="panel">
                {!data.reviews.length && <p className="muted" style={{ margin: 0 }}>Les avis arrivent après les rendez-vous terminés. Utilisez « Demander un avis » dans le planning.</p>}
                {data.reviews.map((r) => (
                  <div className="row-line" key={r.id}>
                    <div style={{ minWidth: 0, flex: "1 1 260px" }}><span className="stars">{"★".repeat(r.rating)}</span> <b>{r.name}</b> {r.approved ? <span className="pill confirmed">Publié</span> : <span className="pill pending">À valider</span>}<div className="small">« {r.text} »</div></div>
                    <div className="btn-row">
                      {!r.approved && <button className="btn sm" onClick={() => act({ action: "review", id: r.id, approved: true }, "Avis publié")}>Publier</button>}
                      {r.approved && <button className="btn ghost sm" onClick={() => act({ action: "review", id: r.id, approved: false }, "Avis masqué")}>Masquer</button>}
                      <button className="btn ghost sm" onClick={() => act({ action: "review", id: r.id, approved: null }, "Avis supprimé")}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "clients" && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Cliente</th><th>Téléphone</th><th>Instagram</th><th>Anniversaire</th><th>Tampons</th><th>Code</th><th></th></tr></thead>
                  <tbody>
                    {data.clients.map((c) => (
                      <tr key={c.phone}>
                        <td>{c.name}</td><td className="num">{c.phone}</td><td>{c.instagram ? `@${c.instagram}` : "—"}</td><td>{c.birthday || "—"}</td>
                        <td className="num">{c.stamps} / {LOYALTY.goal}</td><td>{c.referral_code}</td>
                        <td><a className="btn ghost sm" href={wa(c.phone, `Bonjour ${c.name} ! `)} target="_blank" rel="noreferrer">Écrire</a></td>
                      </tr>
                    ))}
                    {!data.clients.length && <tr><td colSpan={7} className="muted">Les clientes apparaissent ici après leur première réservation.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "emails" && settings && <EmailsTab settings={settings} setSettings={(x) => setSettings(x as Settings)} mails={data.mails} act={act} live={data.features.mail} />}
            {tab === "compta" && settings && <ComptaTab enabled={data.features.compta} bookings={data.bookings} gifts={data.gifts} invoices={data.invoices} expenses={data.expenses} settings={settings} methods={data.methods} act={act} />}

            {tab === "settings" && settings && (
              <div className="panel" style={{ maxWidth: 720 }}>
                <BusinessSettings settings={settings} setSettings={(x) => setSettings(x as Settings)} />
                <div className="h3" style={{ margin: "18px 0 10px" }}>Paiements</div>
                {!data.features.stripe && <p className="demo-banner small">Paiement par carte en ligne : {data.demo ? "simulé dans la démo." : "ajoutez la clé Stripe pour l’activer (voir le guide)."}</p>}
                <div className="field"><label htmlFor="set-dep">Acompte demandé à la réservation (€, 0 = aucun)</label><input id="set-dep" className="input" inputMode="numeric" value={settings.deposit_amount} onChange={(e) => setSettings({ ...settings, deposit_amount: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></div>
                <div className="field"><label htmlFor="set-depinfo">Comment payer l’acompte</label><textarea id="set-depinfo" className="input" value={settings.deposit_info} onChange={(e) => setSettings({ ...settings, deposit_info: e.target.value })} /></div>
                <div className="field"><label htmlFor="set-pay">Comment payer une carte cadeau ou un pack</label><textarea id="set-pay" className="input" value={settings.payment_info} onChange={(e) => setSettings({ ...settings, payment_info: e.target.value })} /></div>
                <div className="field"><label htmlFor="set-wa">Votre WhatsApp (format 336…)</label><input id="set-wa" className="input" inputMode="tel" value={settings.owner_whatsapp} onChange={(e) => setSettings({ ...settings, owner_whatsapp: e.target.value })} /></div>
                <button className="btn sm" onClick={() => act({ action: "settings", ...settings }, "Réglages enregistrés")}>Enregistrer</button>
              </div>
            )}
          </div>
        )}
      </div>

      {promo && (
        <Modal onClose={() => setPromo(null)} label="Code promo">
          <div className="modal-body">
            <div className="h2" style={{ fontSize: "2rem" }}>{promo.uses || data?.promos.some((p) => p.code === promo.code) ? "Modifier le code" : "Nouveau code promo"}</div>
            <div className="field-row">
              <div className="field"><label htmlFor="p-code">Code</label><input id="p-code" className="input" value={promo.code} onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="NOEL10" /></div>
              <div className="field"><label htmlFor="p-val">Remise</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input id="p-val" className="input" inputMode="numeric" value={promo.value} onChange={(e) => setPromo({ ...promo, value: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                  <select id="p-kind" className="input" style={{ width: 80 }} value={promo.kind} onChange={(e) => setPromo({ ...promo, kind: e.target.value as Promo["kind"] })}><option value="percent">%</option><option value="amount">€</option></select>
                </div>
              </div>
            </div>
            <div className="field"><label htmlFor="p-label">Description affichée</label><input id="p-label" className="input" value={promo.label} onChange={(e) => setPromo({ ...promo, label: e.target.value })} placeholder="−10 % sur toutes les poses de décembre" /></div>
            <div className="field-row">
              <div className="field"><label htmlFor="p-start">Début (facultatif)</label><input id="p-start" type="date" className="input" value={promo.starts} onChange={(e) => setPromo({ ...promo, starts: e.target.value })} /></div>
              <div className="field"><label htmlFor="p-end">Fin (facultatif)</label><input id="p-end" type="date" className="input" value={promo.ends} onChange={(e) => setPromo({ ...promo, ends: e.target.value })} /></div>
            </div>
            <div className="field"><label htmlFor="p-max">Nombre d’utilisations max (0 = illimité)</label><input id="p-max" className="input" inputMode="numeric" value={promo.max_uses} onChange={(e) => setPromo({ ...promo, max_uses: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></div>
            <label className="switch"><input type="checkbox" checked={promo.active} onChange={(e) => setPromo({ ...promo, active: e.target.checked })} /> Actif</label>
            <label className="switch"><input type="checkbox" checked={promo.public} onChange={(e) => setPromo({ ...promo, public: e.target.checked })} /> Afficher dans « Les offres » sur le site</label>
            <button className="btn block" onClick={async () => { if (await act({ action: "savePromo", ...promo }, "Code enregistré")) setPromo(null); }}>Enregistrer</button>
          </div>
        </Modal>
      )}
      {payFor && <PayModal b={payFor} act={act} online={!!data?.features.online} onClose={() => setPayFor(null)} />}
      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="Inspiration en grand" /></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
