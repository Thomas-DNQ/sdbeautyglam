"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADDONS, BIRTHDAY_PERCENT, BRAND, computeEstimate, DESIGNS, DUO_DISCOUNT, formatDuration, LENGTHS, LOYALTY, POLICIES, SERVICES, SHAPES } from "@/lib/catalog";
import { ShapeIcon } from "./ShapeIcon";
import { dayNum, dayShort, hour, longDate, monthShort } from "@/lib/dates";
import { WaitlistForm } from "./WaitlistForm";
import { Confetti, startPayment } from "./Interactive";

type Slot = { id: string; date: string; time: string; flash: number };
type Line = { label: string; amount: number; kind?: string };
type Quote = { lines: Line[]; total: number; giftUsed: number; toPay: number; minutes: number; notes: string[]; reward: number; birthday: boolean; giftBalance: number | null; known: { name: string; stamps: number; birthday: string } | null };
type Result = {
  booking: { id: string; date: string; time: string; estimate: number; minutes: number; gift_used: number; deposit: string };
  deposit: { amount: number; info: string };
  lines: Line[];
  client: { stamps: number; referral_code: string; goal: number } | null;
};

const STEP_TITLES: Record<string, [string, string]> = {
  service: ["Votre prestation", "Choisissez ce que vous voulez faire. Vous pouvez combiner mains et pieds."],
  shape: ["Forme et longueur", "Pas sûre ? Choisissez la plus proche, on ajuste ensemble le jour J."],
  options: ["Les petits plus", "Des options pour sublimer votre pose."],
  inspo: ["Votre inspiration", "Une photo du modèle qui vous plaît permet de confirmer le tarif exact."],
  slot: ["Votre créneau", "Les créneaux flash sont moins chers : idéal si vous êtes flexible."],
  info: ["Vos coordonnées", "Pour vous confirmer le rendez-vous et l’adresse."],
};

async function compress(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 1000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  } finally { URL.revokeObjectURL(url); }
}

export function BookingFlow() {
  const [main, setMain] = useState<string | null>(null);
  const [feet, setFeet] = useState<string | null>(null);
  const [depose, setDepose] = useState(false);
  const [shape, setShape] = useState("");
  const [length, setLength] = useState("M");
  const [addons, setAddons] = useState<string[]>([]);
  const [design, setDesign] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [day, setDay] = useState("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [insta, setInsta] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [referral, setReferral] = useState("");
  const [promo, setPromo] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [showCodes, setShowCodes] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const p = new URLSearchParams((globalThis as unknown as { __sdSearch?: string }).__sdSearch ?? window.location.search);
    const d = DESIGNS.find((x) => x.id === p.get("design"));
    if (d) { setDesign(d.id); setMain(d.service); setShape(d.shape); setLength(d.length); }
    const s = p.get("service"); if (s && SERVICES.some((x) => x.id === s && x.cat === "mains")) setMain(s);
    const sh = p.get("shape"); if (sh) setShape(sh);
    const l = p.get("length"); if (l) setLength(l);
    const r = p.get("code"); if (r) { setReferral(r.toUpperCase()); setShowCodes(true); }
    const pr = p.get("promo"); if (pr) { setPromo(pr.toUpperCase()); setShowCodes(true); }
    const sl = p.get("slot"); if (sl) { setSlotId(sl); setDay(sl.split("_")[0]); }
    fetch("/api/slots").then((r) => r.json()).then((d) => setSlots(d.slots || [])).catch(() => setSlots([]));
  }, []);

  const services = useMemo(() => [main, feet, depose ? "depose" : null].filter(Boolean) as string[], [main, feet, depose]);
  const mainSvc = SERVICES.find((s) => s.id === main);
  const steps = useMemo(() => ["service", ...(main ? ["shape"] : []), "options", "inspo", "slot", "info"], [main]);
  const cur = steps[Math.min(step, steps.length - 1)];
  const slot = (slots || []).find((s) => s.id === slotId);
  const local = computeEstimate({ services, length: mainSvc?.lengthApplies ? length : undefined, addons, flashDiscount: slot?.flash || 0 });
  const days = useMemo(() => Array.from(new Set((slots || []).map((s) => s.date))), [slots]);
  useEffect(() => { if (!day && days.length) setDay(days[0]); }, [days, day]);
  const designObj = DESIGNS.find((d) => d.id === design);

  // Prix exact calculé par le serveur (promo, fidélité, anniversaire, carte cadeau…)
  const quoteKey = JSON.stringify({ services, length: mainSvc?.lengthApplies ? length : "", addons, slotId, phone, promo, referral, giftCode, birthday });
  useEffect(() => {
    if (!services.length || (cur !== "slot" && cur !== "info")) return;
    const t = setTimeout(() => {
      fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: quoteKey })
        .then((r) => r.json()).then((q: Quote) => { setQuote(q); if (q.known && !name) setName(q.known.name); })
        .catch(() => setQuote(null));
    }, 350);
    return () => clearTimeout(t);
  }, [quoteKey, cur, services.length, name]);

  const shown = (cur === "slot" || cur === "info") && quote ? quote : { ...local, toPay: local.total, giftUsed: 0, notes: [] as string[] };

  const canNext =
    cur === "service" ? services.length > 0 :
    cur === "shape" ? !!shape :
    cur === "slot" ? !!slotId :
    cur === "info" ? name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9 :
    true;

  const toggleAddon = (id: string) => setAddons((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const go = (d: number) => { setError(""); setStep((s) => Math.max(0, Math.min(steps.length - 1, s + d))); window.scrollTo({ top: 0, behavior: "smooth" }); };

  async function submit() {
    setSending(true); setError("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, instagram: insta, birthday, services, shape, length: mainSvc?.lengthApplies ? length : "", addons, design, slotId, notes, photo, referral, promo, giftCode }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "La réservation n’a pas abouti. Réessayez.");
        if (r.status === 409) { setSlotId(""); fetch("/api/slots").then((x) => x.json()).then((x) => setSlots(x.slots || [])); }
        return;
      }
      setResult(d);
      window.scrollTo({ top: 0 });
    } catch { setError("Connexion impossible. Vérifiez votre réseau et réessayez."); }
    finally { setSending(false); }
  }

  if (result) return <Confirmation result={result} name={name} main={main} shape={shape} length={length} email={email} />;

  const [title, sub] = STEP_TITLES[cur];
  const isLast = step === steps.length - 1;

  return (
    <main className="book">
      <div className="wrap narrow">
        <div className="progress" aria-label={`Étape ${step + 1} sur ${steps.length}`}>
          {steps.map((s, i) => <span key={s} className={i <= step ? "on" : ""} />)}
        </div>
        <div key={cur} className="step-anim">
        <div className="eyebrow">Étape {step + 1} sur {steps.length}</div>
        <h1 className="display">{title}</h1>
        <p className="muted" style={{ margin: 0 }}>{sub}</p>

        {designObj && cur !== "info" && (
          <div className="design-chip">
            <img src={designObj.img} alt="" />
            <div><small className="muted">Modèle choisi</small><b>{designObj.name}</b></div>
            <button type="button" className="btn ghost sm" onClick={() => setDesign("")}>Retirer</button>
          </div>
        )}

        {cur === "service" && (
          <>
            <div className="eyebrow group-label">Mains · pose complète</div>
            <div className="choices">
              {SERVICES.filter((s) => s.cat === "mains").map((s) => (
                <button key={s.id} type="button" className={`choice ${main === s.id ? "on" : ""}`} onClick={() => { setMain(main === s.id ? null : s.id); setDepose(false); }}>
                  <span className="tick" />
                  <span className="t"><b>{s.name}{s.id === "art2" && <span className="tag">Le plus demandé</span>}</b>{s.detail && <small>{s.detail}</small>}</span>
                  <span className="pr">{s.price} €</span>
                </button>
              ))}
            </div>
            <div className="eyebrow group-label">Pieds {main && <span className="tag">−{DUO_DISCOUNT} € en duo</span>}</div>
            <div className="choices">
              {SERVICES.filter((s) => s.cat === "pieds").map((s) => (
                <button key={s.id} type="button" className={`choice ${feet === s.id ? "on" : ""}`} onClick={() => setFeet(feet === s.id ? null : s.id)}>
                  <span className="tick" />
                  <span className="t"><b>{s.name}</b></span>
                  <span className="pr">{s.price} €</span>
                </button>
              ))}
            </div>
            <div className="eyebrow group-label">Dépose seule</div>
            <div className="choices">
              {SERVICES.filter((s) => s.cat === "depose").map((s) => (
                <button key={s.id} type="button" className={`choice ${depose ? "on" : ""}`} onClick={() => { setDepose(!depose); if (!depose) setMain(null); }}>
                  <span className="tick" />
                  <span className="t"><b>{s.name}</b><small>{s.detail}</small></span>
                  <span className="pr">{s.price} €</span>
                </button>
              ))}
            </div>
            <p className="small" style={{ marginTop: 18 }}>Envie d’un modèle précis ? <Link href="/#modeles">Voir les modèles signature</Link></p>
          </>
        )}

        {cur === "shape" && (
          <>
            <div className="eyebrow group-label">Forme</div>
            <div className="shape-pick">
              {SHAPES.map((s) => (
                <button key={s.id} type="button" className={`choice ${shape === s.id ? "on" : ""}`} onClick={() => setShape(s.id)}>
                  <ShapeIcon shape={s.id} length={Math.max(1, LENGTHS.findIndex((l) => l.id === length))} />
                  <b style={{ fontWeight: 500 }}>{s.name}</b>
                </button>
              ))}
            </div>
            {mainSvc?.lengthApplies ? (
              <>
                <div className="eyebrow group-label">Longueur</div>
                <div className="len-pick">
                  {LENGTHS.map((l) => (
                    <button key={l.id} type="button" className={`choice ${length === l.id ? "on" : ""}`} onClick={() => setLength(l.id)}>
                      <b className="h3">{l.name}</b>
                      <small className="muted">{l.extra ? `+${l.extra} €` : "inclus"}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : <p className="muted small" style={{ marginTop: 16 }}>Le gainage se fait sur votre longueur naturelle.</p>}
          </>
        )}

        {cur === "options" && (
          <>
            {main && !feet && (
              <div className="upsell-hero" style={{ marginTop: 24 }}>
                <div className="t">
                  <b>Ajoutez la beauté des pieds</b><br />
                  <small>Formule duo : −{DUO_DISCOUNT} € sur l’ensemble, en un seul rendez-vous.</small>
                </div>
                <button type="button" className="btn sm" onClick={() => setFeet("pieds")}>Ajouter</button>
              </div>
            )}
            <div className="choices" style={{ marginTop: main && !feet ? 0 : 24 }}>
              {ADDONS.filter((a) => !a.onlyWith || main).map((a) => (
                <button key={a.id} type="button" className={`choice ${addons.includes(a.id) ? "on" : ""}`} onClick={() => toggleAddon(a.id)}>
                  <span className="tick" />
                  <span className="t"><b>{a.name}{a.id === "soin" && <span className="tag">Recommandé</span>}</b><small>{a.detail}</small></span>
                  <span className="pr">+{a.price} €</span>
                </button>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 14 }}>Aucune option n’est obligatoire, vous pouvez passer à la suite.</p>
          </>
        )}

        {cur === "inspo" && (
          <div style={{ marginTop: 24 }}>
            <label className="drop" htmlFor="inspo-file">
              {photo ? <img src={photo} alt="Votre inspiration" /> : designObj ? <img src={designObj.img} alt="Modèle choisi" /> : <div className="h3" style={{ marginBottom: 6 }}>Ajouter une photo</div>}
              <span className="muted small">{photo ? "Touchez pour changer de photo" : designObj ? "Modèle choisi · touchez pour envoyer une autre photo" : "Capture Instagram, Pinterest, TikTok…"}</span>
            </label>
            <input id="inspo-file" type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { setPhoto(await compress(f)); } catch { setError("Cette image n’a pas pu être lue. Essayez une capture d’écran."); }
            }} />
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="notes">Un détail à préciser ? (facultatif)</label>
              <textarea id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : la même chose mais en rouge, ongle cassé à l’index…" />
            </div>
          </div>
        )}

        {cur === "slot" && (
          <div style={{ marginTop: 24 }}>
            {slots === null && <p className="muted">Chargement des disponibilités…</p>}
            {slots && !slots.length && <p>Aucun créneau n’est ouvert pour le moment.</p>}
            {!!days.length && (
              <>
                <div className="days">
                  {days.map((d) => {
                    const hasFlash = (slots || []).some((s) => s.date === d && s.flash);
                    return (
                      <button key={d} type="button" className={`day ${day === d ? "on" : ""}`} onClick={() => { setDay(d); setSlotId(""); }}>
                        <small>{dayShort(d)}</small><b>{dayNum(d)}</b><small>{monthShort(d)}</small>
                        {hasFlash && <i className="flash-dot" aria-label="Créneau flash" />}
                      </button>
                    );
                  })}
                </div>
                <div className="times">
                  {(slots || []).filter((s) => s.date === day).map((s) => (
                    <button key={s.id} type="button" className={`time ${slotId === s.id ? "on" : ""}`} onClick={() => setSlotId(s.id)}>
                      {hour(s.time)}
                      {!!s.flash && <span className="flash">Flash −{s.flash} €</span>}
                    </button>
                  ))}
                </div>
                <p className="muted small" style={{ marginTop: 14 }}>Durée estimée : {formatDuration(shown.minutes)}</p>
              </>
            )}
            <div className="recap" style={{ marginTop: 24 }}>
              <b>Aucun créneau ne vous convient ?</b>
              <p className="muted small" style={{ margin: "4px 0 12px" }}>Inscrivez-vous sur la liste d’attente : vous êtes prévenue dès qu’une place se libère.</p>
              <WaitlistForm />
            </div>
          </div>
        )}

        {cur === "info" && (
          <div style={{ marginTop: 24 }}>
            <div className="field">
              <label htmlFor="phone">Téléphone (WhatsApp de préférence)</label>
              <input id="phone" className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
            </div>
            {quote?.known && (
              <div className="demo-banner" style={{ marginBottom: 16 }}>
                Contente de vous revoir {quote.known.name} ! Ce rendez-vous vous fera passer à {Math.min(LOYALTY.goal, quote.known.stamps + 1)} tampons sur {LOYALTY.goal}.
              </div>
            )}
            <div className="field-row">
              <div className="field">
                <label htmlFor="name">Prénom</label>
                <input id="name" className="input" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="email">Email · confirmation, rappel et facture</label>
                <input id="email" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.fr" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="insta">Instagram (facultatif)</label>
                <input id="insta" className="input" value={insta} onChange={(e) => setInsta(e.target.value)} placeholder="@votrecompte" />
              </div>
              <div className="field">
                <label htmlFor="bday">Anniversaire (JJ/MM) · −{BIRTHDAY_PERCENT} % ce mois-là</label>
                <input id="bday" className="input" inputMode="numeric" value={birthday} onChange={(e) => setBirthday(e.target.value.replace(/[^\d/]/g, "").slice(0, 5))} placeholder="14/03" />
              </div>
            </div>

            {!showCodes ? (
              <button type="button" className="link-btn" onClick={() => setShowCodes(true)}>J’ai un code promo, une carte cadeau ou un code parrainage</button>
            ) : (
              <div className="codes">
                <div className="field">
                  <label htmlFor="promo">Code promo</label>
                  <input id="promo" className="input" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="Ex : HALLOWEEN" />
                </div>
                <div className="field">
                  <label htmlFor="gift">Carte cadeau ou pack</label>
                  <input id="gift" className="input" value={giftCode} onChange={(e) => setGiftCode(e.target.value.toUpperCase())} placeholder="Ex : SD-XXXXXX" />
                </div>
                {!quote?.known && (
                  <div className="field">
                    <label htmlFor="ref">Code parrainage d’une amie</label>
                    <input id="ref" className="input" value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="Ex : AWA2481" />
                  </div>
                )}
              </div>
            )}
            {!!shown.notes.length && <div className="notes">{shown.notes.map((n) => <p key={n} className="err">{n}</p>)}</div>}

            <div className="recap" style={{ marginTop: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Récapitulatif</div>
              {slot && <div className="recap-row"><span>Rendez-vous</span><span>{longDate(slot.date)} · {hour(slot.time)}</span></div>}
              {shape && main && <div className="recap-row"><span>Forme</span><span>{SHAPES.find((s) => s.id === shape)?.name}{mainSvc?.lengthApplies ? ` · ${length}` : ""}</span></div>}
              {shown.lines.map((l) => (
                <div className="recap-row" key={l.label}><span>{l.label}</span><span className={l.amount < 0 ? "neg num" : "num"}>{l.amount < 0 ? "−" : ""}{Math.abs(l.amount)} €</span></div>
              ))}
              <div className="recap-row total"><span>Total estimé</span><span className="num">{shown.total} €</span></div>
              {shown.giftUsed > 0 && (
                <>
                  <div className="recap-row"><span>Payé avec la carte cadeau</span><span className="neg num">−{shown.giftUsed} €</span></div>
                  <div className="recap-row total"><span>Reste à régler</span><span className="num">{shown.toPay} €</span></div>
                </>
              )}
              <p className="muted small" style={{ margin: "8px 0 0" }}>{POLICIES[0]}</p>
            </div>
          </div>
        )}

        {error && <p className="err" role="alert">{error}</p>}
        </div>
      </div>

      <div className="summary-bar">
        <div className="wrap narrow">
          <div>
            {step > 0 ? <button type="button" className="btn ghost sm" onClick={() => go(-1)}>Retour</button> : <Link className="btn ghost sm" href="/">Accueil</Link>}
          </div>
          <div style={{ textAlign: "right", flex: 1 }}>
            <div className="eyebrow" style={{ letterSpacing: ".16em" }}>{shown.giftUsed ? "Reste à régler" : "Estimation"}</div>
            <div className="total num">{shown.giftUsed ? shown.toPay : shown.total} €</div>
          </div>
          {isLast
            ? <button type="button" className="btn" disabled={!canNext || sending} onClick={submit}>{sending ? "Envoi…" : "Réserver"}</button>
            : <button type="button" className="btn" disabled={!canNext} onClick={() => go(1)}>Continuer</button>}
        </div>
      </div>
    </main>
  );
}

function Confirmation({ result, name, main, shape, length, email }: { result: Result; name: string; main: string | null; shape: string; length: string; email: string }) {
  const [copied, setCopied] = useState(false);
  const [payErr, setPayErr] = useState("");
  const b = result.booking;
  const c = result.client;
  const shareText = c ? `Je réserve mes ongles chez SD Beauty Glam à Rennes. Avec mon code ${c.referral_code} tu as −${LOYALTY.referralDiscount} € sur ta première pose !` : "";
  const rebook = main ? `/reserver?service=${main}&shape=${shape}&length=${length}` : "/reserver";
  const start = `${b.date.replace(/-/g, "")}T${b.time.replace(":", "")}00`;
  const endD = new Date(`${b.date}T${b.time}:00`); endD.setMinutes(endD.getMinutes() + b.minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = `${endD.getFullYear()}${pad(endD.getMonth() + 1)}${pad(endD.getDate())}T${pad(endD.getHours())}${pad(endD.getMinutes())}00`;
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Ongles · SD Beauty Glam")}&dates=${start}/${end}&ctz=Europe/Paris&location=${encodeURIComponent(BRAND.city)}`;
  return (
    <main className="book">
      <Confetti />
      <div className="wrap narrow step-anim">
        <div className="done-mark" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </div>
        <div className="eyebrow">Demande envoyée</div>
        <h1 className="display">Merci {name} !</h1>
        <p style={{ color: "var(--ink-2)" }}>
          Votre créneau du <b>{longDate(b.date)} à {hour(b.time)}</b> est bloqué. SD Beauty Glam vous confirme le tarif et l’adresse par message très vite.
        </p>

        {email && <p className="small muted" style={{ marginTop: -6 }}>Un email de confirmation part à <b>{email}</b>.</p>}
        {b.deposit === "due" && result.deposit.amount > 0 && (
          <div className="upsell-hero" style={{ marginBottom: 14 }}>
            <div className="t"><b>Acompte de {result.deposit.amount} € pour valider</b><br /><small>Réglez-le en ligne par carte en 30 secondes, ou {result.deposit.info.toLowerCase()}</small></div>
            <button type="button" className="btn sm" onClick={async () => setPayErr((await startPayment({ ref: b.id, part: "deposit" })) || "")}>Payer</button>
          </div>
        )}
        {payErr && <p className="err">{payErr}</p>}

        <div className="recap">
          <div className="recap-row"><span>Total estimé</span><b className="num">{b.estimate} €</b></div>
          {b.gift_used > 0 && <div className="recap-row"><span>Payé avec votre carte</span><span className="neg num">−{b.gift_used} €</span></div>}
          <div className="recap-row"><span>Durée</span><span>{formatDuration(b.minutes)}</span></div>
          {result.lines.filter((l) => l.amount < 0).map((l) => <div className="recap-row" key={l.label}><span>{l.label}</span><span className="neg">−{-l.amount} €</span></div>)}
        </div>

        <div className="btn-row" style={{ marginTop: 16 }}>
          <a className="btn sm" href={gcal} target="_blank" rel="noreferrer">Ajouter à Google Agenda</a>
          <a className="btn ghost sm" href={`/api/ics/${b.id}`}>Calendrier iPhone</a>
          <Link className="btn ghost sm" href={`/rdv/${b.id}`}>Gérer mon RDV</Link>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>Gardez le lien « Gérer mon RDV » : il permet d’annuler ou de laisser un avis.</p>

        {c && (
          <>
            <div className="card-fid" style={{ marginTop: 28 }}>
              <div className="top">
                <div><div className="mono-mark">SD</div><div className="mono-word" style={{ opacity: .7 }}>Beauty Glam</div></div>
                <div className="eyebrow" style={{ color: "rgba(255,253,251,.65)" }}>Carte de {name}</div>
              </div>
              <div className="stamps">
                {Array.from({ length: c.goal }).map((_, i) => (
                  <i key={i} className={i < c.stamps ? "on" : LOYALTY.rewards.some((r) => r.at === i + 1) ? "gift" : ""}>{i < c.stamps ? "✓" : i + 1}</i>
                ))}
              </div>
              <div className="small" style={{ opacity: .75 }}>Votre tampon est ajouté après le rendez-vous.</div>
            </div>

            <h2 className="h3" style={{ marginTop: 32 }}>Offrez −{LOYALTY.referralDiscount} € à une amie</h2>
            <p className="muted small" style={{ margin: "6px 0 0" }}>Elle profite de la remise sur sa première pose, vous gagnez un tampon bonus.</p>
            <div className="code-box">
              <code>{c.referral_code}</code>
              <button type="button" className="btn sm" onClick={async () => {
                try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
              }}>{copied ? "Copié" : "Copier le message"}</button>
            </div>
          </>
        )}

        {main && (
          <div className="upsell-hero" style={{ marginTop: 28 }}>
            <div className="t"><b>Gardez des ongles parfaits</b><br /><small>Réservez dès maintenant votre prochain rendez-vous, environ 3 semaines après celui-ci.</small></div>
            <a className="btn sm" href={rebook}>Réserver</a>
          </div>
        )}
        <div className="upsell-hero light" style={{ marginTop: 14 }}>
          <div className="t"><b>Faites plaisir</b><br /><small>Offrez une carte cadeau SD Beauty Glam, ou économisez jusqu’à 25 € avec un pack.</small></div>
          <Link className="btn sm" href="/cadeau">Voir</Link>
        </div>
        <p style={{ marginTop: 28 }}><Link href="/" className="muted">Retour à l’accueil</Link></p>
      </div>
    </main>
  );
}
