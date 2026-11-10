import { NextResponse } from "next/server";
import { listSlots } from "@/lib/store";
import { MIN_NOTICE_HOURS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const slots = await listSlots(today);
  return NextResponse.json({ slots: slots.filter((s) => !s.taken && new Date(`${s.date}T${s.time}:00`).getTime() - Date.now() >= MIN_NOTICE_HOURS * 36e5).map(({ id, date, time, flash }) => ({ id, date, time, flash })) });
}
