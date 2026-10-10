"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DESIGNS, LENGTHS, SERVICES, SHAPES } from "@/lib/catalog";
import { hour, longDate } from "@/lib/dates";

const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } },
};

/** Les sections sont visibles par défaut ; seules celles sous la ligne de flottaison s'animent à l'arrivée. */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    for (const el of els) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) { el.classList.add("pre"); io.observe(el); }
    }
    return () => io.disconnect();
  }, []);
  return null;
}

export function Modal({ onClose, children, sheet = true, label }: { onClose: () => void; children: React.ReactNode; sheet?: boolean; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className={`overlay ${sheet ? "sheet-mode" : ""}`} onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Fermer">×</button>
        {children}
      </div>
    </div>
  );
}

/** Pop-up de bienvenue : code de première visite, une seule fois par visiteuse. */
export function WelcomePopup({ code, label }: { code: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!code || store.get("sd_welcome_seen")) return;
    const delay = (globalThis as unknown as { __sdPopupDelay?: number }).__sdPopupDelay ?? 7000;
    const t = setTimeout(() => { setOpen(true); store.set("sd_welcome_seen", "1"); }, delay);
    return () => clearTimeout(t);
  }, [code]);
  if (!open) return null;
  return (
    <Modal onClose={() => setOpen(false)} label="Offre de bienvenue">
      <img className="modal-hero" src="/gallery/g00.jpg" alt="" />
      <div className="modal-body">
        <img src="/gallery/logo-sd.png" alt="" width={64} height={64} style={{ borderRadius: "50%", marginTop: -56, border: "4px solid var(--paper)", boxShadow: "var(--shadow-sm)" }} />
        <div className="eyebrow">Première visite</div>
        <div className="h2" style={{ fontSize: "2.2rem" }}>{label || "Une attention pour votre première pose"}</div>
        <p className="muted" style={{ margin: 0 }}>Utilisez ce code au moment de réserver.</p>
        <div className="code-box" style={{ marginTop: 4 }}>
          <code>{code}</code>
          <button type="button" className="btn ghost sm" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copié" : "Copier"}</button>
        </div>
        <Link className="btn block" href={`/reserver?promo=${code}`}>Réserver avec ce code</Link>
      </div>
    </Modal>
  );
}

/** Petite notification en bas d'écran pour un vrai créneau flash. */
export function FlashNudge({ slot }: { slot: { id: string; date: string; time: string; flash: number } | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!slot || store.get("sd_nudge_" + slot.id)) return;
    const t = setTimeout(() => setShow(true), 14000);
    return () => clearTimeout(t);
  }, [slot]);
  if (!show || !slot) return null;
  return (
    <div className="nudge" role="status">
      <img src="/gallery/g10.jpg" alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="eyebrow" style={{ color: "var(--bronze)" }}>Créneau flash · −{slot.flash} €</div>
        <div className="small"><b>{longDate(slot.date)} à {hour(slot.time)}</b></div>
        <Link href={`/reserver?slot=${slot.id}`} className="small" style={{ color: "var(--bronze-deep)" }}>Le réserver</Link>
      </div>
      <button className="x" aria-label="Fermer" onClick={() => { setShow(false); store.set("sd_nudge_" + slot.id, "1"); }}>×</button>
    </div>
  );
}

/** Carrousel des modèles signature, chaque carte ouvre une fiche. */
export function DesignGallery() {
  const [open, setOpen] = useState<string | null>(null);
  const d = DESIGNS.find((x) => x.id === open);
  const price = (id: string, len: string) => (SERVICES.find((s) => s.id === id)?.price || 0) + (LENGTHS.find((l) => l.id === len)?.extra || 0);
  return (
    <>
      <div className="designs">
        {DESIGNS.map((x) => (
          <button key={x.id} type="button" className="design-card" onClick={() => setOpen(x.id)}>
            <div style={{ overflow: "hidden" }}><img src={x.img} alt={x.name} loading="lazy" /></div>
            <div className="meta">
              <div className="row"><b className="h3">{x.name}</b><span className="num" style={{ fontWeight: 500 }}>{price(x.service, x.length)} €</span></div>
              <div className="tags">{x.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
          </button>
        ))}
      </div>
      {d && (
        <Modal onClose={() => setOpen(null)} label={d.name}>
          <img className="modal-hero" src={d.img} alt={d.name} style={{ aspectRatio: "1" }} />
          <div className="modal-body">
            <div className="tags">{d.tags.map((t) => <span key={t}>{t}</span>)}</div>
            <div className="h2" style={{ fontSize: "2.2rem" }}>{d.name}</div>
            <div className="recap-row" style={{ padding: 0 }}><span className="muted">Prestation</span><span>{SERVICES.find((s) => s.id === d.service)?.name}</span></div>
            <div className="recap-row" style={{ padding: 0 }}><span className="muted">Forme · taille</span><span>{SHAPES.find((s) => s.id === d.shape)?.name} · {d.length}</span></div>
            <div className="recap-row total" style={{ margin: 0 }}><span>À partir de</span><span className="num">{price(d.service, d.length)} €</span></div>
            <Link className="btn block" href={`/reserver?design=${d.id}`}>Réserver ce modèle</Link>
            <p className="muted small" style={{ margin: 0, textAlign: "center" }}>Couleur et longueur ajustables pendant la réservation.</p>
          </div>
        </Modal>
      )}
    </>
  );
}

/** Confettis légers à la confirmation. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colors = ["#9b6b5a", "#e8d2c9", "#1f1a17", "#c69f8c", "#fffdfb"];
    const parts = Array.from({ length: 120 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.32, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 3, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let raf = 0; const t0 = performance.now();
    const loop = (t: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) { p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
      if (t - t0 < 3200) raf = requestAnimationFrame(loop); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" style={{ width: "100vw", height: "100vh" }} />;
}

/** Ouvre une URL interne ou externe (compatible avec la démo). */
export function openUrl(url: string) {
  if (url.startsWith("/")) { const a = document.createElement("a"); a.href = url; document.body.appendChild(a); a.click(); a.remove(); }
  else window.location.href = url;
}

/** Lance un paiement en ligne et redirige vers la page de paiement. */
export async function startPayment(body: Record<string, unknown>): Promise<string | null> {
  const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const d = await r?.json().catch(() => null);
  if (!r?.ok || !d?.url) return d?.error || "Paiement en ligne indisponible pour le moment.";
  openUrl(d.url);
  return null;
}
