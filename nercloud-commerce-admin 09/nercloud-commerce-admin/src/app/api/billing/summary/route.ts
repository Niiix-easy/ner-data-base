import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function GET(){
 const [open,paid,pending,activeSubs,customers,usage]=await Promise.all([
  db.invoice.aggregate({where:{status:{in:["OPEN","UNCOLLECTIBLE"]}},_sum:{amountDueCents:true}}),
  db.invoice.aggregate({where:{status:"PAID"},_sum:{totalCents:true}}),
  db.payment.aggregate({where:{status:"PENDING"},_sum:{amountCents:true}}),
  db.subscription.count({where:{status:{in:["ACTIVE","TRIALING"]}}}),
  db.customer.count(),
  db.usageEvent.aggregate({_sum:{quantity:true},_count:{_all:true}})
 ]);
 return NextResponse.json({openCents:open._sum.amountDueCents??0,paidCents:paid._sum.totalCents??0,pendingPaymentCents:pending._sum.amountCents??0,activeSubscriptions:activeSubs,customers,usageEvents:usage._count._all,usageQuantity:usage._sum.quantity??0});
}
