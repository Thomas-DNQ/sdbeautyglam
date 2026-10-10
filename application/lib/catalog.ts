// ─────────────────────────────────────────────────────────────
//  CATALOGUE SD BEAUTY GLAM — modifiez les prix et les offres ici
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  name: "SD Beauty Glam",
  tagline: "Prothésiste ongulaire diplômée",
  city: "Beauregard, Rennes (35)",
  instagram: "sdbeauty.glam",
  instagramUrl: "https://instagram.com/sdbeauty.glam",
};

export type Service = {
  id: string;
  cat: "mains" | "pieds" | "depose";
  name: string;
  detail?: string;
  price: number;
  minutes: number;
  lengthApplies?: boolean;
};

export const SERVICES: Service[] = [
  { id: "gainage", cat: "mains", name: "Gainage / renfort", detail: "Sur ongle naturel, couleur unie", price: 30, minutes: 90 },
  { id: "rallongement", cat: "mains", name: "Rallongement au gel", detail: "Couleur unie ou nude", price: 35, minutes: 120, lengthApplies: true },
  { id: "art1", cat: "mains", name: "Nail art niveau 1", detail: "French, baby-boomer, strass, minimaliste", price: 40, minutes: 135, lengthApplies: true },
  { id: "art2", cat: "mains", name: "Nail art niveau 2", detail: "Aurora, chrome, sirène, 3D, torsadée…", price: 45, minutes: 150, lengthApplies: true },
  { id: "art3", cat: "mains", name: "Nail art niveau 3", detail: "Nail art mix, bague 3D, plusieurs fleurs 3D…", price: 50, minutes: 165, lengthApplies: true },
  { id: "pieds", cat: "pieds", name: "Beauté des pieds", price: 25, minutes: 45 },
  { id: "pieds-art", cat: "pieds", name: "Pieds French, couleur unie, strass", price: 30, minutes: 60 },
  { id: "pieds-carre", cat: "pieds", name: "Pieds rallongement forme carrée", price: 35, minutes: 75 },
  { id: "depose", cat: "depose", name: "Dépose seule", detail: "Uniquement poses réalisées chez SD Beauty Glam", price: 15, minutes: 30 },
];

export const SHAPES = [
  { id: "square", name: "Carrée" },
  { id: "coffin", name: "Coffin" },
  { id: "almond", name: "Amande" },
  { id: "stiletto", name: "Stiletto" },
] as const;

export const LENGTHS = [
  { id: "XS", name: "XS", extra: 0 },
  { id: "S", name: "S", extra: 0 },
  { id: "M", name: "M", extra: 0 },
  { id: "L", name: "L", extra: 5 },
  { id: "XL", name: "XL", extra: 10 },
] as const;

export const ADDONS = [
  { id: "depose-pose", name: "Dépose de mon ancienne pose SD", detail: "Avant la nouvelle pose", price: 10, onlyWith: "mains" as const, minutes: 20 },
  { id: "soin", name: "Soin cuticules + huile nourrissante", detail: "Finition nette, tenue prolongée", price: 5, minutes: 10 },
  { id: "strass", name: "Strass & bijoux d'ongle sur 2 doigts", detail: "La touche qui brille", price: 5, onlyWith: "mains" as const, minutes: 10 },
  { id: "chrome", name: "Effet chrome ou aurora sur 2 ongles", detail: "Accent miroir", price: 5, onlyWith: "mains" as const, minutes: 10 },
  { id: "fleur3d", name: "Fleur 3D sur 2 ongles", detail: "Sculptée à la main", price: 8, onlyWith: "mains" as const, minutes: 15 },
  { id: "huile", name: "Huile cuticules SD à emporter", detail: "Pour garder la pose nickel jusqu'au prochain RDV", price: 9, minutes: 0 },
];

// Modèles signature : la cliente choisit un modèle, la réservation est pré-remplie
export const DESIGNS = [
  { id: "rouge-fleurs", name: "Rouge Bloom", img: "/gallery/s2.jpg", service: "art3", shape: "square", length: "M", tags: ["Fleurs 3D", "Best-seller"] },
  { id: "french-strass", name: "French Diamant", img: "/gallery/g00.jpg", service: "art1", shape: "almond", length: "L", tags: ["French", "Strass"] },
  { id: "ocean", name: "Océan Fleuri", img: "/gallery/g01.jpg", service: "art2", shape: "almond", length: "L", tags: ["Fleurs", "Bleu"] },
  { id: "gold-chrome", name: "Gold Rush", img: "/gallery/g10.jpg", service: "art2", shape: "almond", length: "M", tags: ["Chrome", "Doré"] },
  { id: "french-blanche", name: "French Classique", img: "/gallery/g11.jpg", service: "art1", shape: "coffin", length: "M", tags: ["French", "Intemporel"] },
  { id: "pois-bordeaux", name: "Pois Bordeaux", img: "/gallery/g12.jpg", service: "art1", shape: "almond", length: "M", tags: ["Minimaliste"] },
  { id: "noir-fleurs", name: "Black Petals", img: "/gallery/s1.jpg", service: "art2", shape: "square", length: "S", tags: ["French noire", "Fleurs"] },
];

// Boutique : cartes cadeaux et packs prépayés (crédit utilisable à chaque RDV)
export const GIFT_AMOUNTS = [30, 50, 80, 100];
export const PACKS = [
  { id: "pack-glam", name: "Pack Glam", pay: 110, credit: 120, detail: "≈ 3 poses nail art niveau 1", perk: "10 € offerts" },
  { id: "pack-queen", name: "Pack Queen", pay: 200, credit: 225, detail: "≈ 5 poses nail art niveau 1", perk: "25 € offerts" },
  { id: "pack-duo", name: "Pack Mains + Pieds", pay: 190, credit: 210, detail: "≈ 3 rendez-vous duo", perk: "20 € offerts" },
];

export const DUO_DISCOUNT = 5;
export const BIRTHDAY_PERCENT = 10; // pendant le mois d'anniversaire

export const LOYALTY = {
  goal: 10,
  rewards: [
    { at: 5, amount: 5, label: "−5 € sur votre 5e rendez-vous" },
    { at: 10, amount: 30, label: "Votre 10e pose : 30 € offerts" },
  ],
  referralDiscount: 5,
};

export const POLICIES = [
  "Envoyez une photo d'inspiration : le tarif est confirmé selon le modèle choisi, avant le rendez-vous.",
  "Je ne réalise pas de dépose de poses faites ailleurs.",
  "Annulation ou report gratuit jusqu'à 24 h avant, depuis votre lien de rendez-vous.",
];

export type Promo = { code: string; kind: "percent" | "amount"; value: number; label: string; starts: string; ends: string; active: boolean; public: boolean; uses: number; max_uses: number };

export function computeEstimate(opts: {
  services: string[];
  length?: string;
  addons: string[];
  referral?: boolean;
  loyaltyDiscount?: number;
  flashDiscount?: number;
  promo?: Pick<Promo, "kind" | "value" | "code"> | null;
  birthday?: boolean;
  giftBalance?: number;
}) {
  const lines: { label: string; amount: number; kind?: "discount" | "payment" }[] = [];
  const chosen = SERVICES.filter((s) => opts.services.includes(s.id));
  for (const s of chosen) lines.push({ label: s.name, amount: s.price });
  const main = chosen.find((s) => s.cat === "mains");
  if (main?.lengthApplies && opts.length) {
    const l = LENGTHS.find((x) => x.id === opts.length);
    if (l && l.extra) lines.push({ label: `Taille ${l.name}`, amount: l.extra });
  }
  let addonMinutes = 0;
  for (const a of ADDONS.filter((a) => opts.addons.includes(a.id))) {
    if (a.onlyWith === "mains" && !main) continue;
    lines.push({ label: a.name, amount: a.price });
    addonMinutes += a.minutes;
  }
  const subtotal = lines.reduce((t, l) => t + l.amount, 0);
  const disc = (label: string, amount: number) => { if (amount > 0) lines.push({ label, amount: -amount, kind: "discount" }); };
  const hasFeet = chosen.some((s) => s.cat === "pieds");
  if (main && hasFeet) disc("Formule duo mains + pieds", DUO_DISCOUNT);
  if (opts.flashDiscount) disc("Créneau flash", opts.flashDiscount);
  if (opts.birthday) disc(`Mois d'anniversaire −${BIRTHDAY_PERCENT} %`, Math.round((subtotal * BIRTHDAY_PERCENT) / 100));
  if (opts.promo) disc(`Code ${opts.promo.code}`, opts.promo.kind === "percent" ? Math.round((subtotal * opts.promo.value) / 100) : opts.promo.value);
  if (opts.referral) disc("Code parrainage", LOYALTY.referralDiscount);
  if (opts.loyaltyDiscount) disc("Récompense fidélité", opts.loyaltyDiscount);
  const total = Math.max(0, lines.reduce((t, l) => t + l.amount, 0));
  const giftUsed = Math.min(total, Math.max(0, opts.giftBalance || 0));
  const minutes = chosen.reduce((t, s) => t + s.minutes, 0) + addonMinutes;
  return { lines, subtotal, total, giftUsed, toPay: total - giftUsed, minutes };
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? String(m).padStart(2, "0") : ""}` : `${m} min`;
}
