"use client";

import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Modal, openUrl } from "./Interactive";
import { longDate } from "@/lib/dates";

export type Pay = { id: string; method: string; amount: number; at: string };
export type ABooking = { id: string; client_name: string; date: string; time: string; status: string; estimate: number; final_price: number | null; gift_used: number; payments?: Pay[]; invoice?: string | null; services: string[]; email?: string; phone: string };
export type AGift = { code: string; label: string; pay: number; status: string; buyer_name: string; payments?: Pay[]; invoice?: string | null };
export type AInvoice = { id: string; no: string; date: string; customer: { name: string }; total: number };
export type AExpense = { id: string; date: string; label: string; category: string; amount: number };
export type AMail = { id: string; kind: string; to: string; subject: string; html: string; at: string; status: string };
export type ASettings = Record<string, string | number | boolean>;

type Act = (body: Record<string, unknown>, msg?: string) => Promise<boolean>;
const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
export const dueOf = (b: ABooking) => Math.max(0, (b.final_price ?? b.estimate) - b.gift_used - (b.payments || []).reduce((t, p) => t + p.amount, 0));

const METHODS: [string, string][] = [["especes", "Espèces"], ["carte", "Carte (TPE)"], ["qr", "Carte via QR code"], ["lydia", "Lydia / PayPal"], ["virement", "Virement"]];

function QR({ text }: { text: string }) {
  const svg = useMemo(() => { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }, [text]);
  return <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Fenêtre « Encaisser » : espèces, carte, QR de paiement par carte, Lydia, virement. */
export function PayModal({ b, act, online, onClose }: { b: ABooking; act: Act; online: boolean; onClose: () => void }) {
  const due = dueOf(b);
  const [rows, setRows] = useState<{ method: string; amount: string }[]>([{ method: "especes", amount: String(due) }]);
  const [markDone, setMarkDone] = useState(b.status !== "done");
  const [qrUrl, setQrUrl] = useState("");
  const [err, setErr] = useState("");
  const total = rows.reduce((t, r) => t + (Number(r.amount.replace(",", ".")) || 0), 0);
  const usesQr = rows.some((r) => r.method === "qr");

  async function submit() {
    setErr("");
    if (usesQr) {
      const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "payLink", id: b.id }) });
      const d = await r.json();
      if (!r.ok || !d.url) { setErr(d.error || "Lien de paiement indisponible."); return; }
      setQrUrl(d.url.startsWith("/") ? window.location.origin + d.url : d.url);
      return;
    }
    if (total <= 0) { setErr("Indiquez un montant."); return; }
    if (await act({ action: "pay", id: b.id, markDone, items: rows.map((r) => ({ method: r.method, amount: Number(r.amount.replace(",", ".")) || 0 })) }, total >= due ? "Encaissé · facture créée" : "Encaissement partiel noté")) onClose();
  }

  return (
    <Modal onClose={onClose} label="Encaisser">
      <div className="modal-body">
        <div className="eyebrow">Encaisser · {b.client_name}</div>
        <div className="h2" style={{ fontSize: "2.4rem" }}>{eur(due)}</div>
        <div className="small muted" style={{ marginTop: -8 }}>Reste à régler sur {eur(b.final_price ?? b.estimate)}{b.gift_used ? ` (dont ${eur(b.gift_used)} déjà payés en carte cadeau)` : ""}</div>
        {!qrUrl ? (
          <>
            {rows.map((r, i) => (
              <div key={i} className="pay-row">
                <div className="method-chips">
                  {METHODS.filter(([m]) => m !== "qr" || online).map(([m, l]) => (
                    <button key={m} type="button" className={`chip opt ${r.method === m ? "on" : ""}`} onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, method: m, amount: m === "qr" ? String(due) : x.amount } : x)))}>{l}</button>
                  ))}
                </div>
                {r.method !== "qr" && <input className="input" inputMode="decimal" aria-label="Montant" value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^\d,.]/g, "") } : x)))} />}
              </div>
            ))}
            {!usesQr && <button type="button" className="link-btn" onClick={() => setRows([...rows, { method: "carte", amount: String(Math.max(0, due - total)) }])}>+ Payer avec un autre moyen (paiement en plusieurs fois)</button>}
            {!usesQr && <label className="switch"><input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} /> Marquer le RDV terminé (+1 tampon fidélité)</label>}
            {usesQr && <p className="small muted" style={{ margin: 0 }}>Un QR code s’affiche : la cliente le scanne et paie par carte, Apple Pay ou Google Pay sur son téléphone. L’encaissement et la facture se font tout seuls.</p>}
            {err && <p className="err">{err}</p>}
            <button className="btn block" onClick={submit}>{usesQr ? "Afficher le QR code" : `Encaisser ${eur(total)}${total >= due ? " et facturer" : ""}`}</button>
          </>
        ) : (
          <>
            <QR text={qrUrl} />
            <p className="small muted" style={{ textAlign: "center", margin: 0 }}>Faites scanner ce code à la cliente. Le paiement de {eur(due)} se valide automatiquement.</p>
            {qrUrl.includes("/paiement?") && <button className="btn ghost block" onClick={() => { onClose(); openUrl(qrUrl.replace(window.location.origin, "").replace(/back=[^&]*/, "back=%2Fadmin")); }}>Démo : simuler le scan</button>}
            <button className="btn block" onClick={onClose}>Fermer</button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Onglet Emails : relances automatiques + historique des envois. */
export function EmailsTab({ settings, setSettings, mails, act, live }: { settings: ASettings; setSettings: (s: ASettings) => void; mails: AMail[]; act: Act; live: boolean }) {
  const [preview, setPreview] = useState<AMail | null>(null);
  const autos: [string, string, string][] = [
    ["auto_reminder", "Rappel la veille du rendez-vous", "Moins d’oublis, moins de lapins"],
    ["auto_review", "Demande d’avis le lendemain", "Plus d’avis 5 étoiles sur le site"],
    ["auto_rebook", "Relance remplissage", `Si la cliente n’a pas repris RDV ${settings.rebook_days} jours après`],
    ["auto_birthday", "Email d’anniversaire −10 %", "Le mois de son anniversaire"],
  ];
  return (
    <>
      <div className={live ? "demo-banner" : "demo-banner"} style={{ marginBottom: 14, background: live ? "color-mix(in srgb, var(--ok) 15%, transparent)" : undefined, color: live ? "var(--ok)" : undefined }}>
        {live ? "Envoi réel activé : les emails partent vraiment." : "Mode aperçu : les emails sont préparés et visibles ici. Ajoutez la clé Resend pour les envoyer réellement."}
      </div>
      <div className="admin-grid">
        <div className="panel">
          <div className="h3">Relances automatiques</div>
          <p className="muted small">Envoyées chaque matin, une seule fois par cliente.</p>
          {autos.map(([k, l, d]) => (
            <div className="row-line" key={k}>
              <div><b style={{ fontWeight: 500 }}>{l}</b><div className="muted small">{d}</div></div>
              <label className="toggle"><input type="checkbox" checked={!!settings[k]} onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })} /><span /></label>
            </div>
          ))}
          <div className="row-line">
            <span className="small">Relance remplissage après</span>
            <span><input className="price-in" inputMode="numeric" value={String(settings.rebook_days)} onChange={(e) => setSettings({ ...settings, rebook_days: Number(e.target.value.replace(/\D/g, "")) || 21 })} aria-label="Jours" /> jours</span>
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn sm" onClick={() => act({ action: "settings", ...settings }, "Relances enregistrées")}>Enregistrer</button>
            <button className="btn ghost sm" onClick={() => act({ action: "runAutomations" }, "Relances lancées")}>Lancer les relances maintenant</button>
          </div>
        </div>
        <div className="panel">
          <div className="h3">Emails envoyés automatiquement</div>
          <ul className="small" style={{ paddingLeft: 18, color: "var(--ink-2)", lineHeight: 1.9 }}>
            <li>Demande reçue (dès la réservation)</li>
            <li>Rendez-vous confirmé (quand vous confirmez)</li>
            <li>Facture (dès que le RDV est réglé)</li>
            <li>Carte cadeau activée + facture</li>
            <li>Rappel J-1, avis, remplissage, anniversaire</li>
          </ul>
        </div>
      </div>
      <div className="h3" style={{ margin: "26px 0 10px" }}>Historique</div>
      <div className="panel">
        {!mails.length && <p className="muted" style={{ margin: 0 }}>Aucun email pour l’instant. Ils apparaissent dès qu’une cliente réserve avec son email.</p>}
        {mails.map((m) => (
          <div className="row-line" key={m.id}>
            <div style={{ minWidth: 0, flex: "1 1 240px" }}>
              <span className={`pill ${m.status === "sent" ? "confirmed" : m.status === "failed" ? "cancelled" : "done"}`}>{m.status === "sent" ? "Envoyé" : m.status === "failed" ? "Échec" : "Aperçu"}</span> <b style={{ fontWeight: 500 }}>{m.kind}</b>
              <div className="muted small" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.to} · {m.subject} · {longDate(m.at.slice(0, 10))}</div>
            </div>
            <button className="btn ghost sm" onClick={() => setPreview(m)}>Voir</button>
          </div>
        ))}
      </div>
      {preview && (
        <Modal onClose={() => setPreview(null)} label="Aperçu de l’email" sheet={false}>
          <div className="modal-body" style={{ padding: 0 }}>
            <div style={{ padding: "18px 20px 0" }}><div className="eyebrow">À : {preview.to}</div><b>{preview.subject}</b></div>
            <div dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
        </Modal>
      )}
    </>
  );
}

type Rec = { date: string; no: string; client: string; nature: string; method: string; amount: number };

/** Module Comptabilité (option payante). */
export function ComptaTab({ enabled, bookings, gifts, invoices, expenses, settings, methods, act }: {
  enabled: boolean; bookings: ABooking[]; gifts: AGift[]; invoices: AInvoice[]; expenses: AExpense[]; settings: ASettings; methods: Record<string, string>; act: Act;
}) {
  const now = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [exp, setExp] = useState({ date: now, label: "", category: "Produits", amount: "" });

  const recettes = useMemo<Rec[]>(() => {
    const invNo = (id?: string | null) => invoices.find((i) => i.id === id)?.no || "—";
    const r: Rec[] = [];
    for (const b of bookings) for (const p of b.payments || []) r.push({ date: p.at.slice(0, 10), no: invNo(b.invoice), client: b.client_name, nature: "Prestation", method: methods[p.method] || p.method, amount: p.amount });
    for (const g of gifts) for (const p of g.payments || []) r.push({ date: p.at.slice(0, 10), no: invNo(g.invoice), client: g.buyer_name, nature: g.label, method: methods[p.method] || p.method, amount: p.amount });
    return r.sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, gifts, invoices, methods]);

  if (!enabled) {
    return (
      <div className="locked">
        <div className="locked-card step-anim">
          <div className="eyebrow" style={{ color: "var(--nude)" }}>Option</div>
          <div className="h2" style={{ color: "var(--paper)" }}>Module Comptabilité</div>
          <p style={{ color: "rgba(255,253,251,.75)" }}>Tout ce qu’il faut pour une micro-entreprise, calculé automatiquement depuis vos encaissements.</p>
          <ul className="perks" style={{ color: "var(--paper)" }}>
            <li><b>✓</b><span>Livre des recettes obligatoire, prêt à exporter</span></li>
            <li><b>✓</b><span>Montant à déclarer à l’URSSAF chaque mois ou trimestre</span></li>
            <li><b>✓</b><span>Alertes seuil de TVA et plafond micro-entreprise</span></li>
            <li><b>✓</b><span>Suivi des dépenses et bénéfice réel</span></li>
          </ul>
          <p className="small" style={{ color: "rgba(255,253,251,.65)", marginBottom: 0 }}>Demandez l’activation à votre prestataire.</p>
        </div>
      </div>
    );
  }

  const y = now.slice(0, 4), m = now.slice(0, 7);
  const q = Math.floor((Number(now.slice(5, 7)) - 1) / 3);
  const inPeriod = (d: string) => period === "month" ? d.startsWith(m) : period === "year" ? d.startsWith(y) : d.startsWith(y) && Math.floor((Number(d.slice(5, 7)) - 1) / 3) === q;
  const rec = recettes.filter((r) => inPeriod(r.date));
  const ca = rec.reduce((t, r) => t + r.amount, 0);
  const rate = (Number(settings.urssaf_rate) + Number(settings.cfp_rate) + (settings.vl_enabled ? Number(settings.vl_rate) : 0)) / 100;
  const cotis = Math.round(ca * rate * 100) / 100;
  const dep = expenses.filter((e) => inPeriod(e.date)).reduce((t, e) => t + e.amount, 0);
  const caYear = recettes.filter((r) => r.date.startsWith(y)).reduce((t, r) => t + r.amount, 0);
  const vatPct = Math.min(100, (caYear / Number(settings.vat_threshold || 1)) * 100);
  const ceilPct = Math.min(100, (caYear / Number(settings.ca_ceiling || 1)) * 100);
  const prevMonth = new Date(Number(y), Number(now.slice(5, 7)) - 2, 15).toISOString().slice(0, 7);
  const toDeclareMonth = recettes.filter((r) => r.date.startsWith(prevMonth)).reduce((t, r) => t + r.amount, 0);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(Number(y), Number(now.slice(5, 7)) - 1 - (11 - i), 15).toISOString().slice(0, 7); return { k: d, v: recettes.filter((r) => r.date.startsWith(d)).reduce((t, r) => t + r.amount, 0) }; });
  const maxM = Math.max(1, ...months.map((x) => x.v));
  const byMethod = Object.entries(rec.reduce<Record<string, number>>((a, r) => ({ ...a, [r.method]: (a[r.method] || 0) + r.amount }), {})).sort((a, b) => b[1] - a[1]);
  const label = period === "month" ? "ce mois" : period === "quarter" ? "ce trimestre" : "cette année";

  function exportCsv() {
    const rows = [["Date", "N° facture", "Client", "Nature", "Mode de règlement", "Montant"], ...recettes.slice().reverse().map((r) => [r.date, r.no, r.client, r.nature, r.method, r.amount.toFixed(2).replace(".", ",")])];
    const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `livre-des-recettes-${y}.csv`; a.click();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="seg">
          {([["month", "Mois"], ["quarter", "Trimestre"], ["year", "Année"]] as const).map(([k, l]) => <button key={k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>{l}</button>)}
        </div>
        <button className="btn ghost sm" onClick={exportCsv}>Exporter le livre des recettes (CSV)</button>
      </div>
      <div className="kpis">
        <div className="kpi"><small>Chiffre d’affaires {label}</small><b>{eur(ca)}</b><small>{rec.length} encaissements</small></div>
        <div className="kpi"><small>Cotisations estimées</small><b>{eur(cotis)}</b><small>{(rate * 100).toFixed(1).replace(".", ",")} % du CA</small></div>
        <div className="kpi"><small>Dépenses {label}</small><b>{eur(dep)}</b><small>produits, matériel…</small></div>
        <div className="kpi"><small>Bénéfice estimé</small><b>{eur(Math.round((ca - cotis - dep) * 100) / 100)}</b><small>après cotisations et dépenses</small></div>
      </div>
      <div className="tomorrow">
        <div className="eyebrow" style={{ color: "var(--nude)" }}>Déclaration URSSAF</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <span>CA à déclarer pour {new Date(prevMonth + "-15").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} (déclaration mensuelle)</span>
          <b className="h2" style={{ fontSize: "1.9rem", color: "var(--paper)" }}>{eur(toDeclareMonth)}</b>
        </div>
        <div className="small" style={{ opacity: .7 }}>Cotisations correspondantes ≈ {eur(Math.round(toDeclareMonth * rate * 100) / 100)}. À saisir sur autoentrepreneur.urssaf.fr.</div>
      </div>
      <div className="admin-grid">
        <div className="panel">
          <div className="h3">Seuils {y}</div>
          <div style={{ marginTop: 14 }}>
            <div className="row-line" style={{ border: 0, paddingBottom: 4 }}><span className="small">Franchise de TVA</span><span className="small num">{eur(caYear)} / {eur(Number(settings.vat_threshold))}</span></div>
            <div className="meter"><i style={{ width: `${vatPct}%`, background: vatPct > 85 ? "var(--bad)" : vatPct > 65 ? "var(--warn)" : "var(--ok)" }} /></div>
            <div className="row-line" style={{ border: 0, paddingBottom: 4, marginTop: 10 }}><span className="small">Plafond micro-entreprise</span><span className="small num">{eur(caYear)} / {eur(Number(settings.ca_ceiling))}</span></div>
            <div className="meter"><i style={{ width: `${ceilPct}%`, background: ceilPct > 85 ? "var(--bad)" : "var(--ok)" }} /></div>
            <p className="muted small" style={{ marginBottom: 0 }}>{vatPct > 85 ? "Attention : vous approchez du seuil de TVA." : "Vous êtes largement sous les seuils."} Les seuils se règlent dans Réglages.</p>
          </div>
        </div>
        <div className="panel">
          <div className="h3">Encaissé par mois</div>
          <div className="bar-chart" style={{ marginTop: 28, marginBottom: 24 }}>
            {months.map((x) => <div key={x.k} style={{ height: `${(x.v / maxM) * 100}%` }}><em>{x.v ? Math.round(x.v) : ""}</em><span>{new Date(x.k + "-15").toLocaleDateString("fr-FR", { month: "narrow" })}</span></div>)}
          </div>
        </div>
      </div>
      {!!byMethod.length && (
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="h3" style={{ marginBottom: 8 }}>Moyens de paiement {label}</div>
          {byMethod.map(([k, v]) => (
            <div key={k} style={{ display: "grid", gridTemplateColumns: "130px 1fr 80px", gap: 10, alignItems: "center", padding: "5px 0" }}>
              <span className="small">{k}</span><div className="meter"><i style={{ width: `${(v / ca) * 100}%`, background: "var(--bronze)" }} /></div><span className="small num" style={{ textAlign: "right" }}>{eur(v)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="h3" style={{ margin: "26px 0 10px" }}>Livre des recettes</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Facture</th><th>Client</th><th>Nature</th><th>Règlement</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead>
          <tbody>
            {rec.map((r, i) => <tr key={i}><td className="num">{r.date.split("-").reverse().join("/")}</td><td>{r.no}</td><td>{r.client}</td><td>{r.nature}</td><td>{r.method}</td><td className="num" style={{ textAlign: "right" }}>{eur(r.amount)}</td></tr>)}
            {!rec.length && <tr><td colSpan={6} className="muted">Aucun encaissement sur la période.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="h3" style={{ margin: "26px 0 10px" }}>Dépenses</div>
      <div className="panel">
        <div className="exp-form">
          <input id="exp-date" type="date" className="input" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} aria-label="Date" />
          <input id="exp-label" className="input" value={exp.label} onChange={(e) => setExp({ ...exp, label: e.target.value })} placeholder="Ex : gels, lampe, pub" aria-label="Libellé" />
          <select id="exp-cat" className="input" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })} aria-label="Catégorie">
            {["Produits", "Matériel", "Marketing", "Formation", "Déplacements", "Autre"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <input id="exp-amount" className="input" inputMode="decimal" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value.replace(/[^\d,.]/g, "") })} placeholder="Montant €" aria-label="Montant" />
          <button className="btn sm" onClick={async () => { if (await act({ action: "addExpense", ...exp }, "Dépense ajoutée")) setExp({ ...exp, label: "", amount: "" }); }}>Ajouter</button>
        </div>
        {expenses.map((e) => (
          <div className="row-line" key={e.id}>
            <span><span className="num muted small">{e.date.split("-").reverse().join("/")}</span> · {e.label} <span className="tags" style={{ display: "inline-flex" }}><span>{e.category}</span></span></span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}><b className="num">{eur(e.amount)}</b><button className="btn ghost sm" onClick={() => act({ action: "deleteExpense", id: e.id }, "Dépense supprimée")}>×</button></span>
          </div>
        ))}
        <p className="muted small" style={{ marginBottom: 0 }}>En micro-entreprise, les dépenses ne réduisent pas les cotisations : ce suivi sert à connaître votre vrai bénéfice.</p>
      </div>
      <p className="muted small" style={{ marginTop: 16 }}>Estimations indicatives basées sur vos réglages (taux et seuils modifiables dans Réglages). Vérifiez les montants officiels sur urssaf.fr.</p>
    </>
  );
}

/** Réglages entreprise et fiscaux (pour les factures et la compta). */
export function BusinessSettings({ settings, setSettings }: { settings: ASettings; setSettings: (s: ASettings) => void }) {
  const f = (k: string, label: string, ph = "", type = "text") => (
    <div className="field" key={k}><label htmlFor={`set-${k}`}>{label}</label>
      <input id={`set-${k}`} className="input" type={type} inputMode={type === "number" ? "decimal" : undefined} value={String(settings[k] ?? "")} placeholder={ph}
        onChange={(e) => setSettings({ ...settings, [k]: type === "number" ? Number(e.target.value) : e.target.value })} /></div>
  );
  return (
    <>
      <div className="h3" style={{ margin: "8px 0 10px" }}>Entreprise (mentions sur les factures)</div>
      <div className="field-row">{f("business_name", "Nom commercial")}{f("legal_form", "Statut", "Entrepreneur individuel (micro-entreprise)")}</div>
      <div className="field-row">{f("siret", "SIRET", "123 456 789 00012")}{f("contact_email", "Email de contact", "contact@…")}</div>
      {f("address", "Adresse")}
      {f("vat_mention", "Mention TVA", "TVA non applicable, art. 293 B du CGI")}
      <div className="h3" style={{ margin: "18px 0 10px" }}>Fiscalité (module Comptabilité)</div>
      <div className="field-row">{f("urssaf_rate", "Cotisations sociales (%)", "21.2", "number")}{f("cfp_rate", "Formation pro CFP (%)", "0.3", "number")}</div>
      <div className="field-row">
        <label className="switch" style={{ alignSelf: "end", paddingBottom: 18 }}><input type="checkbox" checked={!!settings.vl_enabled} onChange={(e) => setSettings({ ...settings, vl_enabled: e.target.checked })} /> Versement libératoire de l’impôt</label>
        {f("vl_rate", "Taux versement libératoire (%)", "1.7", "number")}
      </div>
      <div className="field-row">{f("vat_threshold", "Seuil franchise TVA (€)", "37500", "number")}{f("ca_ceiling", "Plafond micro-entreprise (€)", "77700", "number")}</div>
    </>
  );
}
