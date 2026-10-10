"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wish, setWish] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  if (state === "done") return <p className="small" style={{ margin: 0 }}>C’est noté ! Vous serez contactée dès qu’un créneau se libère.</p>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault(); setError(""); setState("sending");
        const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, wish }) }).catch(() => null);
        if (r?.ok) setState("done"); else { setState("idle"); setError((await r?.json().catch(() => null))?.error || "Envoi impossible, réessayez."); }
      }}
      className="wait-form"
    >
      <input id="wl-name" className="input" placeholder="Prénom" value={name} onChange={(e) => setName(e.target.value)} aria-label="Prénom" />
      <input id="wl-phone" className="input" placeholder="Téléphone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Téléphone" />
      <input id="wl-wish" className="input" placeholder="Vos préférences (ex : samedi matin)" value={wish} onChange={(e) => setWish(e.target.value)} aria-label="Préférences" />
      <button className="btn sm" type="submit" disabled={state === "sending"}>{state === "sending" ? "Envoi…" : "M’inscrire"}</button>
      {error && <p className="err" style={{ gridColumn: "1 / -1" }}>{error}</p>}
    </form>
  );
}
