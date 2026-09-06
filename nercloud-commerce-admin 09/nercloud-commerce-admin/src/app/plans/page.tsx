import { db } from "@/lib/db";
import { money } from "@/lib/money";
export default async function Plans() {
 const plans=await db.plan.findMany({include:{versions:{include:{prices:true},orderBy:{version:"desc"},take:1}},orderBy:{name:"asc"}});
 return <><h1>Plan management</h1><p className="muted">Planos e versão de preços.</p><div className="grid">{plans.map(p=>{const v=p.versions[0];const price=v?.prices[0];return <div className="card" key={p.id}><h2>{p.name}</h2><p className="muted">{p.description ?? ""}</p><div className="label">Status</div><p>{p.status}</p><div className="label">Preço atual</div><div className="value">{price?money(price.amountCents,price.currency):"-"}</div><small>v{v?.version ?? "-"}</small></div>})}</div></>
}
