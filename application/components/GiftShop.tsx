"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GIFT_AMOUNTS, PACKS } from "@/lib/catalog";
import { Confetti, Modal, startPayment } from "./Interactive";

type Done = { code: string; label: string; pay: number; credit: number; payment_info: string; online: boolean };

export function GiftShop() {
  const [kind, setKind] = useState<"card" | "pack">("card");
  const [amount, setAmount] = useState(50);
  const [custom, setCustom] = useState("");
  const [packId, setPackId] = useState(PACKS[0].id);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [payErr, setPayErr] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [check, setCheck] = useState("");
  const [balance, setBalance] = useState<string>("");

  useEffect(() => { if (new URLSearchParams((globalThis as unknown as { __sdSearch?: string }).__sdSearch ?? window.location.search).get("pack")) setKind("pack"); }, []);
  const value = custom ? Number(custom) || 0 : amount;
  const pack = PACKS.find((p) => p.id === packId)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSending(true);
    try {
      const r = await fetch("/api/gifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, amount: value, packId, recipient, message, name, phone, email }) });
      const d = await r.json();
      if (!r.ok) setError(d.error || "La commande n’a pas abouti."); else setDone(d);
    } catch { setError("Connexion impossible. Réessayez."); } finally { setSending(false); }
  }

  return (
    <main className="book">
      <div className="wrap narrow">
        <div className="eyebrow rise">Boutique</div>
        <h1 className="display rise d1">Cartes cadeaux & packs</h1>
        <p className="muted rise d2">Offrez un moment SD Beauty Glam, ou prépayez vos poses et gagnez jusqu’à 25 €.</p>

        <div className="tabs rise d2" role="tablist" style={{ marginTop: 20 }}>
          <button role="tab" aria-selected={kind === "card"} className={`tab ${kind === "card" ? "on" : ""}`} onClick={() => setKind("card")}>Carte cadeau</button>
          <button role="tab" aria-selected={kind === "pack"} className={`tab ${kind === "pack" ? "on" : ""}`} onClick={() => setKind("pack")}>Packs prépayés</button>
        </div>

        <form onSubmit={submit} key={kind} className="step-anim">
          {kind === "card" ? (
            <>
              <div className="gift-card" style={{ margin: "8px 0 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                  <div><div className="mono-mark">SD</div><div className="mono-word" style={{ opacity: .75 }}>Beauty Glam</div></div>
                  <div className="eyebrow" style={{ color: "rgba(255,253,251,.75)" }}>Carte cadeau</div>
                </div>
                <div style={{ position: "relative" }}>
                  {recipient && <div className="small" style={{ opacity: .85 }}>Pour {recipient}</div>}
                  <div className="amt num">{value || "—"} €</div>
                </div>
              </div>
              <div className="eyebrow group-label">Montant</div>
              <div className="amounts">
                {GIFT_AMOUNTS.map((a) => (
                  <button key={a} type="button" className={`choice ${!custom && amount === a ? "on" : ""}`} style={{ justifyContent: "center" }} onClick={() => { setAmount(a); setCustom(""); }}>
                    <span className="pr">{a} €</span>
                  </button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="custom">Autre montant (20 à 300 €)</label>
                <input id="custom" className="input" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Ex : 65" />
              </div>
              <div className="field-row">
                <div className="field"><label htmlFor="to">Pour qui ?</label><input id="to" className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Prénom de la personne" /></div>
                <div className="field"><label htmlFor="msg">Petit mot (facultatif)</label><input id="msg" className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Joyeux anniversaire !" /></div>
              </div>
            </>
          ) : (
            <div className="packs" style={{ margin: "8px 0 24px" }}>
              {PACKS.map((p) => (
                <button key={p.id} type="button" className={`pack ${packId === p.id ? "on" : ""}`} onClick={() => setPackId(p.id)}>
                  <span className="tag perk">{p.perk}</span>
                  <span className="h3">{p.name}</span>
                  <span className="small muted">{p.detail}</span>
                  <span style={{ marginTop: 8 }}><span className="h2" style={{ fontSize: "2rem" }}>{p.pay} €</span> <span className="muted small">→ {p.credit} € de crédit</span></span>
                </button>
              ))}
            </div>
          )}

          <div className="eyebrow group-label">Vos coordonnées</div>
          <div className="field-row">
            <div className="field"><label htmlFor="g-name">Votre prénom</label><input id="g-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label htmlFor="g-phone">Votre téléphone</label><input id="g-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" /></div>
          </div>
          <div className="field"><label htmlFor="g-email">Email · pour recevoir le code et la facture</label><input id="g-email" className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.fr" /></div>
          {error && <p className="err">{error}</p>}
          <button className="btn block" type="submit" disabled={sending} style={{ marginTop: 8 }}>
            {sending ? "Envoi…" : kind === "card" ? `Commander la carte de ${value || 0} €` : `Commander le ${pack.name} · ${pack.pay} €`}
          </button>
          <p className="muted small" style={{ textAlign: "center" }}>Le code est activé dès réception du paiement, puis utilisable à la réservation.</p>
        </form>

        <div className="recap" style={{ marginTop: 32 }}>
          <b>Vérifier le solde d’une carte</b>
          <form style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }} onSubmit={async (e) => {
            e.preventDefault();
            const d = await fetch(`/api/gifts?code=${encodeURIComponent(check)}`).then((r) => r.json()).catch(() => null);
            setBalance(!d?.found ? "Code introuvable." : d.status !== "active" ? `${d.label} · en attente d’activation` : `${d.label} · solde ${d.balance} €`);
          }}>
            <input id="g-check" className="input" style={{ flex: "1 1 180px" }} value={check} onChange={(e) => setCheck(e.target.value.toUpperCase())} placeholder="SD-XXXXXX" aria-label="Code de la carte" />
            <button className="btn sm" type="submit">Vérifier</button>
          </form>
          {balance && <p className="small" style={{ marginBottom: 0 }}>{balance}</p>}
        </div>
      </div>

      {done && (
        <>
          <Confetti />
          <Modal onClose={() => setDone(null)} label="Commande enregistrée">
            <div className="modal-body">
              <div className="eyebrow">Commande enregistrée</div>
              <div className="h2" style={{ fontSize: "2rem" }}>{done.label}</div>
              <p style={{ margin: 0 }}>Votre code :</p>
              <div className="code-box"><code>{done.code}</code></div>
              <div className="recap">
                <div className="recap-row"><span>À régler</span><b>{done.pay} €</b></div>
                <div className="recap-row"><span>Crédit utilisable</span><b>{done.credit} €</b></div>
                <p className="muted small" style={{ margin: "8px 0 0" }}>{done.online ? "Payez maintenant par carte : la carte est activée tout de suite. Ou réglez sur place : " + done.payment_info.charAt(0).toLowerCase() + done.payment_info.slice(1) : done.payment_info}</p>
              </div>
              {done.online && <button className="btn block" onClick={async () => setPayErr((await startPayment({ kind: "gift", ref: done.code })) || "")}>Payer {done.pay} € par carte</button>}
              {payErr && <p className="err">{payErr}</p>}
              <p className="muted small" style={{ margin: 0 }}>Faites une capture de cet écran. Le code est à saisir au moment de réserver, dans « J’ai un code ».</p>
              <Link className={done.online ? "btn ghost block" : "btn block"} href="/reserver">Réserver un rendez-vous</Link>
            </div>
          </Modal>
        </>
      )}
    </main>
  );
}
