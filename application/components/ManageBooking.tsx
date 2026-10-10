"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDuration, SERVICES, SHAPES } from "@/lib/catalog";
import { hour, longDate } from "@/lib/dates";
import { Modal, startPayment } from "./Interactive";

type Data = {
  booking: { id: string; status: string; client_name: string; services: string[]; shape: string; length: string; date: string; time: string; minutes: number; estimate: number; final_price: number | null; gift_used: number; deposit: string; payments: { label: string; amount: number; at: string }[]; invoice: string | null; due: number };
  online: boolean;
  canCancel: boolean;
  deposit: { amount: number; info: string };
  review: { rating: number; text: string } | null;
};
const LABEL: Record<string, string> = { pending: "En attente de confirmation", confirmed: "Confirmé", done: "Terminé", cancelled: "Annulé" };

export function ManageBooking({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch(`/api/bookings/${id}`).then(async (r) => { const d = await r.json(); if (!r.ok) setErr(d.error); else setData(d); }).catch(() => setErr("Connexion impossible."));
  }, [id]);
  useEffect(load, [load]);

  async function act(body: object) {
    const r = await fetch(`/api/bookings/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); return false; }
    load(); return true;
  }

  if (err) return <main className="book"><div className="wrap narrow"><h1 className="display">Rendez-vous introuvable</h1><p className="muted">{err}</p><Link className="btn" href="/reserver">Réserver</Link></div></main>;
  if (!data) return <main className="book"><div className="wrap narrow"><div className="skeleton" style={{ height: 48, width: "60%" }} /><div className="skeleton" style={{ height: 180, marginTop: 20 }} /></div></main>;
  const b = data.booking;
  const price = b.final_price ?? b.estimate;

  return (
    <main className="book">
      <div className="wrap narrow step-anim">
        <div className="eyebrow">Mon rendez-vous</div>
        <h1 className="display">{longDate(b.date)}</h1>
        <p className="h3" style={{ marginTop: 4 }}>à {hour(b.time)} · {formatDuration(b.minutes)}</p>
        <span className={`pill ${b.status}`} style={{ marginTop: 10 }}>{LABEL[b.status]}</span>

        <div className="recap" style={{ marginTop: 20 }}>
          <div className="recap-row"><span>Prestation</span><span>{b.services.map((s) => SERVICES.find((x) => x.id === s)?.name || s).join(" + ")}</span></div>
          {b.shape && <div className="recap-row"><span>Forme</span><span>{SHAPES.find((s) => s.id === b.shape)?.name}{b.length ? ` · ${b.length}` : ""}</span></div>}
          <div className="recap-row total"><span>{b.final_price !== null ? "Tarif confirmé" : "Estimation"}</span><span className="num">{price} €</span></div>
          {b.gift_used > 0 && <div className="recap-row"><span>Payé avec la carte cadeau</span><span className="neg">−{b.gift_used} €</span></div>}
          {b.payments.map((p, i) => <div className="recap-row" key={i}><span>Réglé · {p.label}</span><span className="neg">−{p.amount} €</span></div>)}
          {b.status !== "cancelled" && <div className="recap-row total"><span>{b.due > 0 ? "Reste à régler" : "Tout est réglé"}</span><span className="num">{b.due > 0 ? `${b.due} €` : "✓"}</span></div>}
        </div>

        {b.status !== "cancelled" && b.due > 0 && data.online && (
          <div className="upsell-hero light" style={{ marginTop: 14 }}>
            <div className="t"><b>Payer en ligne par carte</b><br /><small>Carte, Apple Pay ou Google Pay. Votre facture arrive par email.</small></div>
            <div className="btn-row">
              {b.deposit === "due" && data.deposit.amount > 0 && <button className="btn ghost sm" onClick={async () => setMsg((await startPayment({ ref: b.id, part: "deposit" })) || "")}>Acompte {Math.min(data.deposit.amount, b.due)} €</button>}
              <button className="btn sm" onClick={async () => setMsg((await startPayment({ ref: b.id, part: "full" })) || "")}>Payer {b.due} €</button>
            </div>
          </div>
        )}
        {b.invoice && <p style={{ marginTop: 14 }}><Link className="btn ghost sm" href={`/facture/${b.invoice}`}>Voir ma facture</Link></p>}

        {b.deposit === "due" && data.deposit.amount > 0 && b.status !== "cancelled" && !data.online && (
          <div className="upsell-hero" style={{ marginTop: 14 }}><div className="t"><b>Acompte de {data.deposit.amount} € à régler</b><br /><small>{data.deposit.info}</small></div></div>
        )}
        {b.deposit === "paid" && <p className="small" style={{ color: "var(--ok)" }}>Acompte reçu, merci !</p>}

        {(b.status === "pending" || b.status === "confirmed") && (
          <div className="btn-row" style={{ marginTop: 18 }}>
            <a className="btn sm" href={`/api/ics/${b.id}`}>Ajouter au calendrier</a>
            {data.canCancel
              ? <button className="btn ghost sm" onClick={() => setAsk(true)}>Annuler le rendez-vous</button>
              : <span className="muted small">Moins de 24 h avant : contactez SD Beauty Glam pour toute modification.</span>}
          </div>
        )}

        {b.status === "done" && (
          <div className="recap" style={{ marginTop: 22 }}>
            {data.review ? (
              <p style={{ margin: 0 }}>Merci pour votre avis ! <span className="stars">{"★".repeat(data.review.rating)}</span></p>
            ) : (
              <form onSubmit={async (e) => { e.preventDefault(); if (await act({ action: "review", rating, text })) setMsg("Merci ! Votre avis sera publié après validation."); }}>
                <div className="h3">Votre avis compte</div>
                <div style={{ display: "flex", gap: 4, margin: "10px 0" }} role="radiogroup" aria-label="Note">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)}
                      style={{ border: 0, background: "none", fontSize: "2rem", cursor: "pointer", color: n <= rating ? "var(--bronze)" : "var(--line)", transition: "transform .2s", transform: n <= rating ? "scale(1.08)" : "none" }}>★</button>
                  ))}
                </div>
                <textarea id="review-text" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Qu’avez-vous pensé de votre pose ?" />
                <button className="btn sm" type="submit" style={{ marginTop: 10 }}>Publier mon avis</button>
              </form>
            )}
          </div>
        )}
        {msg && <p className="small" style={{ marginTop: 10 }}>{msg}</p>}
        <div className="btn-row" style={{ marginTop: 26 }}>
          <Link className="btn ghost sm" href="/reserver">Nouveau rendez-vous</Link>
          <Link className="btn ghost sm" href="/fidelite">Ma carte de fidélité</Link>
        </div>
      </div>

      {ask && (
        <Modal onClose={() => setAsk(false)} label="Annuler le rendez-vous">
          <div className="modal-body">
            <div className="h2" style={{ fontSize: "2rem" }}>Annuler ce rendez-vous ?</div>
            <p className="muted" style={{ margin: 0 }}>Le créneau du {longDate(b.date)} à {hour(b.time)} sera libéré pour une autre cliente.{b.gift_used ? " Le montant utilisé sur votre carte cadeau vous est recrédité." : ""}</p>
            <button className="btn block" onClick={async () => { if (await act({ action: "cancel" })) { setAsk(false); setMsg("Rendez-vous annulé."); } }}>Oui, annuler</button>
            <button className="btn ghost block" onClick={() => setAsk(false)}>Garder mon rendez-vous</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
