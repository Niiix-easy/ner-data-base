import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({customerId:z.string(),invoiceId:z.string().optional(),amountCents:z.number().int().positive(),currency:z.string().default("BRL"),method:z.enum(["CARD","PIX","BANK_TRANSFER","MANUAL"]),provider:z.string().optional(),providerRef:z.string().optional()});
export async function POST(req:NextRequest){
 try{
  const x=schema.parse(await req.json());
  const payment=await db.$transaction(async tx=>{
   const p=await tx.payment.create({data:x});
   if(x.invoiceId){
    const i=await tx.invoice.findUnique({where:{id:x.invoiceId}});
    if(i && x.amountCents>=i.amountDueCents){
      await tx.invoice.update({where:{id:i.id},data:{status:"PAID",amountDueCents:0,paidAt:new Date()}});
    } else if(i){
      await tx.invoice.update({where:{id:i.id},data:{amountDueCents:{decrement:x.amountCents}}});
    }
   }
   return p;
  });
  return NextResponse.json(payment,{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"invalid request"},{status:400})}
}
