import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({slug:z.string().min(2),name:z.string().min(2),description:z.string().optional(),currency:z.string().default("BRL"),amountCents:z.number().int().nonnegative(),interval:z.string().default("month")});
export async function POST(req:NextRequest){
 try{
  const x=schema.parse(await req.json());
  const plan=await db.$transaction(async tx=>{
   const p=await tx.plan.create({data:{slug:x.slug,name:x.name,description:x.description}});
   const v=await tx.planVersion.create({data:{planId:p.id,version:1,effectiveAt:new Date()}});
   await tx.price.create({data:{planVersionId:v.id,currency:x.currency,amountCents:x.amountCents,interval:x.interval}});
   return tx.plan.findUnique({where:{id:p.id},include:{versions:{include:{prices:true}}}});
  });
  return NextResponse.json(plan,{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"invalid request"},{status:400})}
}
