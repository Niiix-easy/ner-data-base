import { db } from "@/lib/db";
import { money } from "@/lib/money";
export default async function Payments() {
  const rows=await db.payment.findMany({include:{customer:true,invoice:true},orderBy:{createdAt:"desc"},take:100});
  return <><h1>Payment management</h1><p className="muted">Pagamentos, status e referências do provedor.</p><table className="table"><thead><tr><th>Cliente</th><th>Fatura</th><th>Valor</th><th>Método</th><th>Status</th><th>Provedor</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{p.customer.name}</td><td>{p.invoice?.number ?? "-"}</td><td>{money(p.amountCents,p.currency)}</td><td>{p.method}</td><td><span className="status">{p.status}</span></td><td>{p.provider ?? "-"}</td></tr>)}</tbody></table></>
}
