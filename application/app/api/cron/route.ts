import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Appelé chaque matin par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await runAutomations());
}
