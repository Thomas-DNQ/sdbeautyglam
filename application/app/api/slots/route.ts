import { NextResponse } from "next/server";
import { listSlots } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const slots = await listSlots(today);
  return NextResponse.json({ slots: slots.filter((s) => !s.taken).map(({ id, date, time, flash }) => ({ id, date, time, flash })) });
}
