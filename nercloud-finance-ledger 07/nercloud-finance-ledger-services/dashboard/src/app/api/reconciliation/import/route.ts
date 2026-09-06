import {db} from "@neercloud/db"; import {NextRequest} from "next/server";
export async function POST(req:NextRequest){try{
 const b=await req.json(), rows=b.transactions||[];
 if(!b.accountId||!Array.isArray(rows))return Response.json({error:"accountId e transactions são obrigatórios."},{status:400});
 const result=[];
 for(const x of rows){
  const t=await db.externalTransaction.upsert({where:{accountId_externalId:{accountId:b.accountId,externalId:String(x.externalId)}},update:{occurredAt:new Date(x.occurredAt),description:x.description,amount:x.amount,currency:x.currency||"BRL",rawData:x},create:{accountId:b.accountId,externalId:String(x.externalId),occurredAt:new Date(x.occurredAt),description:x.description,amount:x.amount,currency:x.currency||"BRL",rawData:x}});
  result.push(t);
 }
 await db.auditLog.create({data:{action:"IMPORT",entityType:"ReconciliationAccount",entityId:b.accountId,after:{count:result.length}}});
 return Response.json({data:result});
}catch(e){return Response.json({error:"Importação inválida."},{status:400})}}
