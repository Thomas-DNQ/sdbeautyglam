import { NextResponse } from "next/server";
import { quote } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const q = await quote(body);
  return NextResponse.json({
    ...q.est,
    notes: q.notes,
    reward: q.reward,
    birthday: q.birthday,
    giftBalance: q.gift?.balance ?? null,
    known: q.client ? { name: q.client.name, stamps: q.client.stamps, birthday: q.client.birthday } : null,
  });
}
