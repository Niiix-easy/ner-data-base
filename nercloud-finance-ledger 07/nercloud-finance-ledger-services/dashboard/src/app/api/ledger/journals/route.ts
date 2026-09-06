import {db} from "@neercloud/db"; import {NextRequest} from "next/server";
export async function GET(){const data=await db.journalEntry.findMany({include:{lines:{include:{account:true}},period:true},orderBy:{entryDate:"desc"}});return Response.json({data})}
export async function POST(req:NextRequest){try{
 const b=await req.json(); const lines=b.lines||[];
 if(!lines.length)return Response.json({error:"O lançamento precisa de linhas."},{status:400});
 const debit=lines.reduce((s:any,l:any)=>s+Number(l.debit||0),0), credit=lines.reduce((s:any,l:any)=>s+Number(l.credit||0),0);
 if(Math.abs(debit-credit)>0.000001)return Response.json({error:"Débitos e créditos precisam estar equilibrados.",debit,credit},{status:400});
 const data=await db.journalEntry.create({data:{reference:b.reference,description:b.description,currency:b.currency||"BRL",entryDate:b.entryDate?new Date(b.entryDate):new Date(),periodId:b.periodId||null,sourceType:b.sourceType||null,sourceId:b.sourceId||null,metadata:b.metadata,lines:{create:lines.map((l:any)=>({accountId:l.accountId,description:l.description,debit:Number(l.debit||0),credit:Number(l.credit||0),currency:l.currency||b.currency||"BRL",metadata:l.metadata}))}}});
 await db.auditLog.create({data:{action:"CREATE",entityType:"JournalEntry",entityId:data.id,after:data}});
 return Response.json({data},{status:201});
}catch(e){console.error(e);return Response.json({error:"Lançamento inválido."},{status:400})}}
