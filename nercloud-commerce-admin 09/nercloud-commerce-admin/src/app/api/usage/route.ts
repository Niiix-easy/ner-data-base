import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema=z.object({
 customerId:z.string(), subscriptionId:z.string().optional(), meter:z.string().min(1),
 quantity:z.number().int().positive(), occurredAt:z.coerce.date().optional(),
 idempotencyKey:z.string().optional(), metadata:z.record(z.any()).optional()
});

export async function POST(req:NextRequest){
 try {
  const body=schema.parse(await req.json());
  if(body.idempotencyKey){
   const existing=await db.usageEvent.findUnique({where:{idempotencyKey:body.idempotencyKey}});
   if(existing)return NextResponse.json(existing);
  }
  const event=await db.usageEvent.create({data:body});
  return NextResponse.json(event,{status:201});
 } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"invalid request"},{status:400})}
}
