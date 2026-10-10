"use client";

import { useState } from "react";
import Link from "next/link";
import { LOYALTY } from "@/lib/catalog";
import { hour, longDate } from "@/lib/dates";

type Data = { found: boolean; name?: string; stamps?: number; goal?: number; referral_code?: string; upcoming?: { id: string; date: string; time: string; status: string }[]; gifts?: { code: string; label: string; balance: number; status: string }[] };

export function LoyaltyLookup() {
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try {
      const r = await fetch(`/api/loyalty?phone=${encodeURIComponent(phone)}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Numéro invalide."); return; }
      setData(d);
    } catch { setError("Connexion impossible. Réessayez."); }
  }

  const goal = data?.goal || LOYALTY.goal;
  const stamps = data?.stamps || 0;
  const nextReward = LOYALTY.rewards.find((r) => r.at > stamps);

  return (
    <main className="book">
      <div className="wrap narrow step-anim">
        <div className="eyebrow">Carte de fidélité</div>
        <h1 className="display">Ma carte SD</h1>
        <p className="muted">Entrez le numéro utilisé pour vos réservations.</p>
        <form onSubmit={check} style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <input id="loyal-phone" className="input" style={{ flex: "1 1 220px" }} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" aria-label="Numéro de téléphone" />
          <button className="btn" type="submit">Voir ma carte</button>
        </form>
        {error && <p className="err">{error}</p>}

        {!!data?.gifts?.length && (
          <div className="recap" style={{ marginTop: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Mes cartes et packs</div>
            {data.gifts.map((g) => (
              <div className="recap-row" key={g.code}><span>{g.label} · <code>{g.code}</code></span><span>{g.status === "active" ? `${g.balance} €` : "en attente"}</span></div>
            ))}
          </div>
        )}

        {data && !data.found && (
          <div className="recap" style={{ marginTop: 24 }}>
            <p style={{ marginTop: 0 }}>Aucune carte pour ce numéro pour l’instant. Elle est créée automatiquement à votre première réservation en ligne.</p>
            <Link className="btn sm" href="/reserver">Réserver</Link>
          </div>
        )}

        {data?.found && (
          <>
            <div className="card-fid" style={{ marginTop: 28 }}>
              <div className="top">
                <div><div className="mono-mark">SD</div><div className="mono-word" style={{ opacity: .7 }}>Beauty Glam</div></div>
                <div className="eyebrow" style={{ color: "rgba(255,253,251,.65)" }}>Carte de {data.name}</div>
              </div>
              <div className="stamps">
                {Array.from({ length: goal }).map((_, i) => (
                  <i key={i} className={i < stamps ? "on" : LOYALTY.rewards.some((r) => r.at === i + 1) ? "gift" : ""}>{i < stamps ? "✓" : i + 1}</i>
                ))}
              </div>
              <div className="small" style={{ opacity: .8 }}>{stamps} tampon{stamps > 1 ? "s" : ""} sur {goal}</div>
            </div>
            {nextReward && <p style={{ marginTop: 16 }}>Plus que <b>{nextReward.at - stamps}</b> rendez-vous avant : {nextReward.label.toLowerCase()}.</p>}

            {!!data.upcoming?.length && (
              <div className="recap" style={{ marginTop: 18 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Vos prochains rendez-vous</div>
                {data.upcoming.map((u) => (
                  <div className="recap-row" key={u.date + u.time}><Link href={`/rdv/${u.id}`}>{longDate(u.date)} · {hour(u.time)}</Link><span className={`pill ${u.status}`}>{u.status === "confirmed" ? "Confirmé" : "En attente"}</span></div>
                ))}
              </div>
            )}

            <h2 className="h3" style={{ marginTop: 28 }}>Votre code parrainage</h2>
            <p className="muted small" style={{ margin: "6px 0 0" }}>Votre amie a −{LOYALTY.referralDiscount} € sur sa première pose, vous gagnez un tampon.</p>
            <div className="code-box">
              <code>{data.referral_code}</code>
              <button type="button" className="btn sm" onClick={async () => {
                try { await navigator.clipboard.writeText(`Réserve chez SD Beauty Glam (Rennes) avec mon code ${data.referral_code} : −${LOYALTY.referralDiscount} € sur ta première pose !`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
              }}>{copied ? "Copié" : "Copier"}</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
