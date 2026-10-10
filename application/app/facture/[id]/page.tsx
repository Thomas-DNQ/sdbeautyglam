import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/store";
import { InvoiceView } from "@/components/InvoiceView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facture · SD Beauty Glam", robots: { index: false } };

export default async function Page({ params }: { params: { id: string } }) {
  const inv = await getInvoice(params.id);
  if (!inv) notFound();
  return <InvoiceView inv={inv} />;
}
