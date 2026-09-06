import { db } from "@neercloud/db";
import { NextRequest } from "next/server";
type C={params:Promise<{id:string}>};
export async function GET(_:NextRequest,c:C){const{id}=await c.params;const data=await db.billingCycle.findUnique({where:{id}});if(!data)return Response.json({error:"Não encontrado"},{status:404});return Response.json({data})}
export async function PATCH(req:NextRequest,c:C){try{const{id}=await c.params;const data=await db.billingCycle.update({where:{id},data:await req.json()});return Response.json({data})}catch(e){return Response.json({error:"Atualização inválida"},{status:400})}}
export async function DELETE(_:NextRequest,c:C){try{const{id}=await c.params;await db.billingCycle.delete({where:{id}});return Response.json({ok:true})}catch(e){return Response.json({error:"Não foi possível excluir"},{status:400})}}
