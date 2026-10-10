import { getBooking } from "@/lib/store";
import { BRAND, SERVICES } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const b = await getBooking(params.id);
  if (!b) return new Response("Introuvable", { status: 404 });
  const start = new Date(`${b.date}T${b.time}:00+02:00`);
  const end = new Date(start.getTime() + b.minutes * 60000);
  const what = b.services.map((s) => SERVICES.find((x) => x.id === s)?.name || s).join(" + ");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SD Beauty Glam//FR", "BEGIN:VEVENT",
    `UID:${b.id}@sdbeautyglam`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:Ongles · ${BRAND.name}`, `DESCRIPTION:${what}`, `LOCATION:${BRAND.city}`,
    "BEGIN:VALARM", "TRIGGER:-PT24H", "ACTION:DISPLAY", "DESCRIPTION:Rendez-vous ongles demain", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="rdv-sd-beauty-glam.ics"` } });
}
