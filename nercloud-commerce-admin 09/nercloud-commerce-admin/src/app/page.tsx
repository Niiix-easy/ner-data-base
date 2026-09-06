import { db } from "@/lib/db";
import { money } from "@/lib/money";

export default async function BillingDashboard() {
  const [open, paid, pending, customers] = await Promise.all([
    db.invoice.aggregate({where:{status:{in:["OPEN","UNCOLLECTIBLE"]}},_sum:{amountDueCents:true}}),
    db.invoice.aggregate({where:{status:"PAID"},_sum:{totalCents:true}}),
    db.payment.aggregate({where:{status:"PENDING"},_sum:{amountCents:true}}),
    db.customer.count()
  ]);
  return <>
    <div className="top"><div><h1>Billing dashboard</h1><p className="muted">Visão geral do faturamento.</p></div></div>
    <div className="grid">
      <div className="card"><div className="label">Em aberto</div><div className="value">{money(open._sum.amountDueCents ?? 0)}</div></div>
      <div className="card"><div className="label">Faturado como pago</div><div className="value">{money(paid._sum.totalCents ?? 0)}</div></div>
      <div className="card"><div className="label">Pagamentos pendentes</div><div className="value">{money(pending._sum.amountCents ?? 0)}</div></div>
      <div className="card"><div className="label">Clientes</div><div className="value">{customers}</div></div>
    </div>
  </>
}
