"use client";

import { useEffect, useState } from "react";
import { Confetti } from "./Interactive";

/** Page de paiement simulée, utilisée seulement tant que Stripe n'est pas branché (mode démo). */
export function DemoCheckout() {
  const [p, setP] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "paying" | "done">("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    const q = new URLSearchParams((globalThis as unknown as { __sdSearch?: string }).__sdSearch ?? window.location.search);
    setP(Object.fromEntries(q.entries()));
  }, []);
  const amount = Number(p.amount || 0);

  async function pay() {
    setState("paying"); setError("");
    const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "demo-confirm", kind: p.kind, ref: p.ref, amount }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) { setState("idle"); setError(d.error || "Le paiement n’a pas abouti."); return; }
    setTimeout(() => setState("done"), 900);
  }

  return (
    <main className="checkout">
      {state === "done" && <Confetti />}
      <div className="checkout-card step-anim">
        <div className="eyebrow" style={{ color: "var(--taupe)" }}>Paiement sécurisé</div>
        <div className="small muted" style={{ marginTop: 4 }}>{p.label}</div>
        <div className="display" style={{ fontSize: "3rem", margin: "10px 0 18px" }}>{amount.toLocaleString("fr-FR")} €</div>
        {state !== "done" ? (
          <>
            <div className="demo-banner small">Démonstration : aucune carte n’est demandée. En ligne, cette étape ouvre la page de paiement sécurisée Stripe (carte, Apple Pay, Google Pay).</div>
            <div className="paybrands" aria-hidden="true"><span>VISA</span><span>Mastercard</span><span>Apple Pay</span><span>G Pay</span></div>
            <button className="btn block" onClick={pay} disabled={state === "paying"}>{state === "paying" ? <span className="spinner" /> : `Simuler le paiement de ${amount} €`}</button>
            {error && <p className="err">{error}</p>}
          </>
        ) : (
          <>
            <div className="done-mark" aria-hidden="true" style={{ margin: "6px 0 14px" }}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
            <div className="h3">Paiement reçu, merci !</div>
            <p className="muted small">{p.kind === "gift" ? "Votre carte est activée et le code vous est envoyé par email avec la facture." : "La facture vous est envoyée par email dès que le rendez-vous est réglé."}</p>
            <a className="btn block" href={p.back || "/"}>Continuer</a>
          </>
        )}
      </div>
    </main>
  );
}
