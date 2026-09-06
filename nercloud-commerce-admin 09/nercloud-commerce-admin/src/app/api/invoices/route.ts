import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({customerId:z.string(),subscriptionId:z.string().optional(),currency:z.string().default("BRL"),dueAt:z.coerce.date().optional(),lines:z.array(z.object({description:z.string(),quantity:z.number().int().positive(),unitAmountCents:z.number().int().nonnegative(),meter:z.string().optional()})).min(1)});
export async function POST(req:NextRequest){
 try{
  const x=schema.parse(await req.json()); const subtotal=x.lines.reduce((s,l)=>s+l.quantity*l.unitAmountCents,0);
  const number=`INV-${Date.now()}`;
  const invoice=await db.invoice.create({data:{number,customerId:x.customerId,subscriptionId:x.subscriptionId,currency:x.currency,dueAt:x.dueAt,subtotalCents:subtotal,totalCents:subtotal,amountDueCents:subtotal,status:"OPEN",issuedAt:new Date(),lines:{create:x.lines.map(l=>({...l,amountCents:l.quantity*l.unitAmountCents}))}}});
  return NextResponse.json(invoice,{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"invalid request"},{status:400})}
}
