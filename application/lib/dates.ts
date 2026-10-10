const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const DAYS_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

const parse = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

export const dayName = (iso: string) => DAYS[parse(iso).getUTCDay()];
export const dayShort = (iso: string) => DAYS_SHORT[parse(iso).getUTCDay()];
export const dayNum = (iso: string) => parse(iso).getUTCDate();
export const monthShort = (iso: string) => MONTHS_SHORT[parse(iso).getUTCMonth()];
export const longDate = (iso: string) => { const d = parse(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
export const hour = (t: string) => t.replace(":", "h");
export function addDays(iso: string, n: number) { const d = parse(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export const todayISO = () => new Date().toISOString().slice(0, 10);
