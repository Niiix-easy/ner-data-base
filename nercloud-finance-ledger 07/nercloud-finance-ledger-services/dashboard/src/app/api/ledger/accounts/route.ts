import {db} from "@neercloud/db"; import {NextRequest} from "next/server";
export async function GET(){return Response.json({data:await db.ledgerAccount.findMany({include:{parent:true},orderBy:{code:"asc"}})})}
export async function POST(req:NextRequest){try{const b=await req.json();const data=await db.ledgerAccount.create({data:b});await db.auditLog.create({data:{action:"CREATE",entityType:"LedgerAccount",entityId:data.id,after:data}});return Response.json({data},{status:201})}catch(e){return Response.json({error:"Conta inválida"},{status:400})}}
