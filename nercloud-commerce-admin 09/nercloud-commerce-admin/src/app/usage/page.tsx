import { db } from "@/lib/db";
export default async function Usage() {
  const rows = await db.usageEvent.groupBy({by:["meter"],_sum:{quantity:true},_count:{_all:true}});
  return <><h1>Usage dashboard</h1><p className="muted">Consumo por meter.</p><table className="table"><thead><tr><th>Meter</th><th>Eventos</th><th>Quantidade</th></tr></thead><tbody>{rows.map(r=><tr key={r.meter}><td>{r.meter}</td><td>{r._count._all}</td><td>{r._sum.quantity ?? 0}</td></tr>)}</tbody></table></>
}
