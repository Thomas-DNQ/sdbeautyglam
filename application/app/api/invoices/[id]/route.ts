import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const inv = await getInvoice(params.id);
  return inv ? NextResponse.json(inv) : NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
}
