import Link from "next/link";
import { Header } from "./Header";
import { ShapeIcon } from "./ShapeIcon";
import { DesignGallery, FlashNudge, RevealOnScroll, WelcomePopup } from "./Interactive";
import { BIRTHDAY_PERCENT, BRAND, DUO_DISCOUNT, LENGTHS, LOYALTY, PACKS, POLICIES, SERVICES, SHAPES } from "@/lib/catalog";
import { getSettings, listPromos, listReviews, listSlots } from "@/lib/store";
import { hour, longDate, todayISO } from "@/lib/dates";

const GALLERY = ["s2", "g00", "g11", "g01", "g10", "g12", "s1", "g02"];

export async function loadHome() {
  try {
    const today = todayISO();
    const [slots, promos, reviews, settings] = await Promise.all([listSlots(today), listPromos(), listReviews(true), getSettings()]);
    const free = slots.filter((s) => !s.taken);
    const publicPromos = promos.filter((p) => p.active && p.public && (!p.ends || p.ends >= today) && (!p.max_uses || p.uses < p.max_uses));
    const popupPromo = settings.popup_code ? promos.find((p) => p.code === settings.popup_code && p.active) : undefined;
    return { free, flash: free.filter((s) => s.flash > 0), publicPromos, reviews, settings, popupPromo };
  } catch {
    return { free: [], flash: [], publicPromos: [], reviews: [], settings: null, popupPromo: undefined };
  }
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;

export function HomeView({ free, flash, publicPromos, reviews, settings, popupPromo }: HomeData) {
  const next = free[0];
  const weekEnd = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const freeThisWeek = free.filter((s) => s.date <= weekEnd).length;
  const avg = reviews.length ? (reviews.reduce((t, r) => t + r.rating, 0) / reviews.length).toFixed(1).replace(".", ",") : null;
  const announces = [
    settings?.banner,
    flash.length ? `Créneaux flash jusqu’à −${Math.max(...flash.map((f) => f.flash))} € cette semaine` : "",
    `Formule duo mains + pieds : −${DUO_DISCOUNT} €`,
    `−${BIRTHDAY_PERCENT} % pendant votre mois d’anniversaire`,
    "Cartes cadeaux disponibles",
  ].filter(Boolean) as string[];
  const groups = [
    { title: "Pose complète", items: SERVICES.filter((s) => s.cat === "mains"), extra: [{ name: "Taille L", price: "+5" }, { name: "Taille XL", price: "+10" }] },
    { title: "Pédicure", items: SERVICES.filter((s) => s.cat === "pieds"), extra: [] },
    { title: "Dépose", items: SERVICES.filter((s) => s.cat === "depose"), extra: [{ name: "Dépose + nouvelle pose", price: "+10" }] },
  ];

  return (
    <>
      <div className="announce" aria-label="Offres en cours">
        <div className="announce-track">
          {[...announces, ...announces].map((a, i) => <span key={i} aria-hidden={i >= announces.length}>{a}</span>)}
        </div>
      </div>
      <Header />
      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="eyebrow rise">{BRAND.tagline} · {BRAND.city}</div>
              <h1 className="display rise d1" style={{ marginTop: 18 }}>
                <span className="script">Vos ongles,</span>
                signés SD.
              </h1>
              <p className="lead rise d2">Gel, gainage et demi-capsules, du nude parfait au nail art 3D. Choisissez votre modèle, envoyez votre inspiration, réservez en deux minutes.</p>
              <div className="hero-actions rise d3">
                <Link className="btn" href="/reserver">Réserver mon rendez-vous</Link>
                <a className="btn ghost" href="#modeles">Voir les modèles</a>
              </div>
              {next && (
                <div className="next-slot rise d4">
                  <span className="dot" />
                  <span>Prochain créneau : <b>{longDate(next.date)} à {hour(next.time)}</b>{freeThisWeek > 0 && freeThisWeek <= 4 ? ` · plus que ${freeThisWeek} cette semaine` : ""}</span>
                </div>
              )}
              <div className="trust rise d5">
                {avg && <div><b>{avg} ★</b>{reviews.length} avis clientes</div>}
                <div><b>Diplômée</b>prothésiste ongulaire</div>
                <div><b>24 h/24</b>réservation en ligne</div>
              </div>
            </div>
            <div className="hero-photos rise d2">
              <img className="p1" src="/gallery/s2.jpg" alt="Pose nude et rouge avec fleurs, réalisée par SD Beauty Glam" />
              <img className="p2" src="/gallery/g00.jpg" alt="French blanche amande avec strass" />
              <div className="stamp-badge"><span><b>{LOYALTY.goal}</b>tampons<br />= 30 € offerts</span></div>
            </div>
          </div>
        </section>

        <section className="section alt" id="offres">
          <div className="wrap">
            <div className="section-head reveal">
              <div><div className="eyebrow">En ce moment</div><h2 className="h2" style={{ marginTop: 8 }}>Les offres</h2></div>
              <p>Cumulables avec la carte de fidélité. Appliquées automatiquement à la réservation.</p>
            </div>
            <div className="offers">
              {flash.length > 0 && (
                <div className="offer-card dark reveal">
                  <div className="eyebrow" style={{ color: "var(--nude)" }}>Créneaux flash</div>
                  <div className="big">−{Math.max(...flash.map((f) => f.flash))} €</div>
                  <p className="muted grow" style={{ margin: 0 }}>Des places à prix doux pour les plus flexibles.</p>
                  <div className="flash-list">
                    {flash.slice(0, 4).map((f) => <Link key={f.id} className="flash-pill" href={`/reserver?slot=${f.id}`}>{longDate(f.date).split(" ").slice(0, 2).join(" ")} · {hour(f.time)}</Link>)}
                  </div>
                </div>
              )}
              {publicPromos.slice(0, 2).map((p) => (
                <div className="offer-card reveal" key={p.code}>
                  <div className="eyebrow">Code promo</div>
                  <div className="big">−{p.value}{p.kind === "percent" ? " %" : " €"}</div>
                  <p className="grow" style={{ margin: 0, color: "var(--ink-2)" }}>{p.label}</p>
                  <span className="chip-code">{p.code}</span>
                  <Link className="btn ghost sm" href={`/reserver?promo=${p.code}`}>En profiter</Link>
                </div>
              ))}
              <div className="offer-card reveal">
                <div className="eyebrow">Anniversaire</div>
                <div className="big">−{BIRTHDAY_PERCENT} %</div>
                <p className="grow" style={{ margin: 0, color: "var(--ink-2)" }}>Indiquez votre date d’anniversaire à la réservation : la remise s’applique tout le mois.</p>
              </div>
              <div className="offer-card reveal">
                <div className="eyebrow">Duo mains + pieds</div>
                <div className="big">−{DUO_DISCOUNT} €</div>
                <p className="grow" style={{ margin: 0, color: "var(--ink-2)" }}>Une pose et une beauté des pieds dans le même rendez-vous.</p>
              </div>
              <div className="offer-card reveal">
                <div className="eyebrow">Parrainage</div>
                <div className="big">−{LOYALTY.referralDiscount} €</div>
                <p className="grow" style={{ margin: 0, color: "var(--ink-2)" }}>Pour votre amie sur sa première pose, et un tampon bonus pour vous.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="modeles">
          <div className="wrap">
            <div className="section-head reveal">
              <div><div className="eyebrow">Modèles signature</div><h2 className="h2" style={{ marginTop: 8 }}>Choisissez, on s’occupe du reste</h2></div>
              <p>Touchez un modèle pour voir le prix et le réserver en un geste.</p>
            </div>
            <div className="reveal"><DesignGallery /></div>
          </div>
        </section>

        <section className="section alt">
          <div className="wrap">
            <div className="section-head reveal">
              <div><div className="eyebrow">Réalisations</div><h2 className="h2" style={{ marginTop: 8 }}>Le travail parle de lui-même</h2></div>
              <a className="btn ghost sm" href={BRAND.instagramUrl} target="_blank" rel="noreferrer">@{BRAND.instagram}</a>
            </div>
            <div className="gallery reveal">
              {GALLERY.map((g) => <img key={g} src={`/gallery/${g}.jpg`} alt="Réalisation SD Beauty Glam" loading="lazy" />)}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <div className="section-head reveal">
              <div><div className="eyebrow">Réserver</div><h2 className="h2" style={{ marginTop: 8 }}>Plus besoin d’attendre une réponse en DM</h2></div>
            </div>
            <div className="steps">
              <div className="reveal"><div className="step-n">1</div><div className="h3">Composez votre pose</div><p>Prestation, forme, longueur et options. Le prix s’affiche en direct.</p></div>
              <div className="reveal"><div className="step-n">2</div><div className="h3">Montrez votre inspiration</div><p>Ajoutez la photo du modèle qui vous plaît, directement depuis votre galerie.</p></div>
              <div className="reveal"><div className="step-n">3</div><div className="h3">Choisissez votre créneau</div><p>Vous voyez les vraies disponibilités. Le tarif final est confirmé avant le rendez-vous.</p></div>
            </div>
          </div>
        </section>

        <section className="section alt" id="tarifs">
          <div className="wrap">
            <div className="section-head reveal">
              <div><div className="eyebrow">Carte des prestations</div><h2 className="h2" style={{ marginTop: 8 }}>Tarifs</h2></div>
              <p>Formule duo mains + pieds : −{DUO_DISCOUNT} € appliqués automatiquement.</p>
            </div>
            <div className="menu">
              {groups.map((g) => (
                <div key={g.title} className="reveal">
                  <h3>{g.title}</h3>
                  {g.items.map((s) => (
                    <div className="menu-row" key={s.id}>
                      <div className="n">{s.name}{s.detail && <small>{s.detail}</small>}</div>
                      <div className="fill" />
                      <div className="p">{s.price} €</div>
                    </div>
                  ))}
                  {g.extra.map((e) => (
                    <div className="menu-row" key={e.name}>
                      <div className="n muted">{e.name}</div>
                      <div className="fill" />
                      <div className="p">{e.price} €</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="note">Le tarif est confirmé selon le modèle choisi, avant le rendez-vous.</p>
          </div>
        </section>

        <section className="section" id="formes">
          <div className="wrap">
            <div className="section-head reveal">
              <div><div className="eyebrow">Guide</div><h2 className="h2" style={{ marginTop: 8 }}>Formes et longueurs</h2></div>
              <p>Les tailles XS à M sont incluses. Taille L : +5 €, taille XL : +10 €.</p>
            </div>
            <div className="shapes">
              {SHAPES.map((s) => (
                <div className="shape-card reveal" key={s.id}>
                  <ShapeIcon shape={s.id} length={3} />
                  <div className="h3">{s.name}</div>
                </div>
              ))}
            </div>
            <div className="len-scale reveal" aria-label="Échelle des longueurs">
              {LENGTHS.map((l, i) => (
                <div key={l.id}><span style={{ height: 30 + i * 16 }} />{l.name}{l.extra ? ` · +${l.extra} €` : ""}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="section alt" id="fidelite">
          <div className="wrap loyal">
            <div className="reveal">
              <div className="eyebrow">Carte de fidélité</div>
              <h2 className="h2" style={{ marginTop: 8 }}>Chaque pose vous rapproche de 30 € offerts</h2>
              <ul className="perks">
                {LOYALTY.rewards.map((r) => (<li key={r.at}><b>{r.at}e</b><span>{r.label}</span></li>))}
                <li><b>+1</b><span>Parrainez une amie : elle a −{LOYALTY.referralDiscount} € sur sa première pose, vous gagnez un tampon.</span></li>
              </ul>
              <Link className="btn ghost" href="/fidelite">Voir ma carte</Link>
            </div>
            <div className="card-fid reveal" aria-label="Exemple de carte de fidélité">
              <div className="top">
                <div><div className="mono-mark">SD</div><div className="mono-word" style={{ opacity: .7 }}>Beauty Glam</div></div>
                <div className="eyebrow" style={{ color: "rgba(255,253,251,.65)" }}>Carte fidélité</div>
              </div>
              <div className="stamps">
                {Array.from({ length: LOYALTY.goal }).map((_, i) => (
                  <i key={i} className={i < 6 ? "on" : LOYALTY.rewards.some((r) => r.at === i + 1) ? "gift" : ""}>{i < 6 ? "✓" : i + 1}</i>
                ))}
              </div>
              <div className="small" style={{ opacity: .7 }}>Exemple · 6 tampons sur {LOYALTY.goal}</div>
            </div>
          </div>
        </section>

        <section className="section" id="cadeaux">
          <div className="wrap loyal">
            <div className="gift-card reveal" aria-hidden="true">
              <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                <div><div className="mono-mark">SD</div><div className="mono-word" style={{ opacity: .75 }}>Beauty Glam</div></div>
                <div className="eyebrow" style={{ color: "rgba(255,253,251,.75)" }}>Carte cadeau</div>
              </div>
              <div className="amt" style={{ position: "relative" }}>50 €</div>
            </div>
            <div className="reveal">
              <div className="eyebrow">Boutique</div>
              <h2 className="h2" style={{ marginTop: 8 }}>Offrez des ongles parfaits</h2>
              <p style={{ color: "var(--ink-2)" }}>Cartes cadeaux de 30 à 100 €, ou packs prépayés pour économiser toute l’année.</p>
              <ul className="perks">
                {PACKS.map((p) => <li key={p.id}><b style={{ minWidth: 70 }}>+{p.credit - p.pay} €</b><span><b style={{ fontFamily: "var(--body)", fontSize: "1rem", color: "var(--ink)" }}>{p.name}</b> · payez {p.pay} €, profitez de {p.credit} €</span></li>)}
              </ul>
              <Link className="btn" href="/cadeau">Offrir ou économiser</Link>
            </div>
          </div>
        </section>

        {reviews.length > 0 && (
          <section className="section alt">
            <div className="wrap">
              <div className="section-head reveal">
                <div><div className="eyebrow">Avis clientes</div><h2 className="h2" style={{ marginTop: 8 }}>Elles en parlent</h2></div>
                {avg && <p><span className="stars">★★★★★</span> {avg} sur 5 · {reviews.length} avis</p>}
              </div>
              <div className="reviews">
                {reviews.slice(0, 6).map((r) => (
                  <div className="review reveal" key={r.id}>
                    <div className="stars" aria-label={`${r.rating} sur 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                    <p>« {r.text} »</p>
                    <div className="small muted">{r.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="wrap info-grid">
            <div className="reveal">
              <div className="eyebrow">Où</div>
              <p className="h3" style={{ marginTop: 10 }}>{BRAND.city}</p>
              <p className="muted small">L’adresse exacte vous est envoyée à la confirmation du rendez-vous.</p>
            </div>
            <div className="reveal">
              <div className="eyebrow">Bon à savoir</div>
              <ul className="small" style={{ paddingLeft: 18, color: "var(--ink-2)" }}>
                {POLICIES.map((p) => <li key={p} style={{ marginBottom: 6 }}>{p}</li>)}
              </ul>
            </div>
            <div className="reveal">
              <div className="eyebrow">Une question</div>
              <p style={{ marginTop: 10 }}>Écrivez sur Instagram</p>
              <a className="btn ghost sm" href={BRAND.instagramUrl} target="_blank" rel="noreferrer">@{BRAND.instagram}</a>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">
          <span>© {new Date().getFullYear()} SD Beauty Glam · Nails · Lashes · Brows</span>
          <span style={{ display: "flex", gap: 16 }}><Link href="/cadeau" className="muted">Cartes cadeaux</Link><Link href="/admin" className="muted">Espace gérante</Link></span>
        </div>
      </footer>
      <div className="mobile-cta">
        <div><div className="eyebrow" style={{ letterSpacing: ".18em" }}>Pose dès</div><div className="h3">30 €</div></div>
        <Link className="btn" href="/reserver">Réserver</Link>
      </div>
      <RevealOnScroll />
      {popupPromo && <WelcomePopup code={popupPromo.code} label={popupPromo.label} />}
      <FlashNudge slot={flash[0] ? { id: flash[0].id, date: flash[0].date, time: flash[0].time, flash: flash[0].flash } : null} />
    </>
  );
}
