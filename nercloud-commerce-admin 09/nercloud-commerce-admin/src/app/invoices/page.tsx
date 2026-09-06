import { db } from "@/lib/db";
import { money } from "@/lib/money";
export default async function Invoices() {
  const rows=await db.invoice.findMany({include:{customer:true},orderBy:{createdAt:"desc"},take:100});
  return <><div className="top"><div><h1>Invoice management</h1><p className="muted">Faturas e valores a receber.</p></div></div><table className="table"><thead><tr><th>Número</th><th>Cliente</th><th>Status</th><th>Total</th><th>Vencimento</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.number}</td><td>{i.customer.name}</td><td><span className="status">{i.status}</span></td><td>{money(i.totalCents,i.currency)}</td><td>{i.dueAt?.toLocaleDateString("pt-BR") ?? "-"}</td></tr>)}</tbody></table></>
}
