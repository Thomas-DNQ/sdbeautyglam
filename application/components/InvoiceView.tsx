"use client";

import type { Invoice } from "@/lib/store";

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const eur = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

export function InvoiceView({ inv }: { inv: Invoice }) {
  const paid = inv.payments.reduce((t, p) => t + p.amount, 0);
  return (
    <main className="invoice-wrap">
      <div className="no-print btn-row" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn sm" onClick={() => window.print()}>Imprimer / PDF</button>
      </div>
      <article className="invoice step-anim">
        <header className="inv-head">
          <div>
            <div className="mono-mark" style={{ fontSize: "2.2rem" }}>SD</div>
            <div className="mono-word">Beauty Glam</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="eyebrow">Facture</div>
            <div className="h2" style={{ fontSize: "1.8rem" }}>{inv.no}</div>
            <div className="small muted">Émise le {fmtDate(inv.date)}</div>
          </div>
        </header>
        <section className="inv-parties">
          <div>
            <div className="eyebrow">Émetteur</div>
            <b>{inv.seller.name}</b>
            <div className="small">{inv.seller.legal}</div>
            <div className="small">{inv.seller.address}</div>
            {inv.seller.siret && <div className="small">SIRET {inv.seller.siret}</div>}
            {inv.seller.email && <div className="small">{inv.seller.email}</div>}
          </div>
          <div>
            <div className="eyebrow">Cliente</div>
            <b>{inv.customer.name}</b>
            {inv.customer.email && <div className="small">{inv.customer.email}</div>}
            <div className="small">{inv.customer.phone}</div>
          </div>
        </section>
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table>
            <thead><tr><th>Désignation</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => <tr key={i}><td style={{ whiteSpace: "normal" }}>{l.label}</td><td className="num" style={{ textAlign: "right" }}>{eur(l.amount)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="inv-total">
          <div className="recap-row total"><span>Total TTC</span><span className="num">{eur(inv.total)}</span></div>
          {inv.paid_with_gift > 0 && <div className="recap-row"><span>Réglé par carte cadeau</span><span className="num">{eur(inv.paid_with_gift)}</span></div>}
          {inv.payments.map((p, i) => <div className="recap-row" key={i}><span>Réglé · {p.method}</span><span className="num">{eur(p.amount)}</span></div>)}
          <div className="recap-row"><span>Reste dû</span><b className="num">{eur(Math.max(0, inv.total - inv.paid_with_gift - paid))}</b></div>
        </div>
        <footer className="small muted" style={{ marginTop: 26, display: "grid", gap: 4 }}>
          <div><b style={{ color: "var(--ink)" }}>{inv.seller.vat}</b></div>
          <div>Facture acquittée. Pas d’escompte pour paiement anticipé.</div>
        </footer>
      </article>
    </main>
  );
}
