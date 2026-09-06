import {db} from "@neercloud/db";
type C={params:Promise<{id:string}>};
export async function POST(_:Request,c:C){
 const {id}=await c.params;
 try{
  const j=await db.journalEntry.findUnique({where:{id},include:{lines:true,period:true}});
  if(!j)return Response.json({error:"Lançamento não encontrado."},{status:404});
  if(j.status!=="DRAFT")return Response.json({error:"Somente DRAFT pode ser publicado."},{status:400});
  if(j.period?.closed)return Response.json({error:"Período contábil fechado."},{status:400});
  const debit=j.lines.reduce((s,l)=>s+Number(l.debit),0),credit=j.lines.reduce((s,l)=>s+Number(l.credit),0);
  if(Math.abs(debit-credit)>0.000001)return Response.json({error:"Lançamento desequilibrado."},{status:400});
  const data=await db.journalEntry.update({where:{id},data:{status:"POSTED",postedAt:new Date()}});
  await db.auditLog.create({data:{action:"POST",entityType:"JournalEntry",entityId:id,before:j,after:data}});
  return Response.json({data});
 }catch(e){return Response.json({error:"Não foi possível publicar."},{status:400})}
}
