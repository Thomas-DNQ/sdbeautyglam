import { isAdmin } from "@/lib/auth";
import { getPhoto } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return new Response("Non autorisé", { status: 401 });
  const p = await getPhoto(params.id);
  if (!p) return new Response("Introuvable", { status: 404 });
  const [meta, data] = p.split(",");
  const type = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  return new Response(Buffer.from(data, "base64"), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=86400" } });
}
