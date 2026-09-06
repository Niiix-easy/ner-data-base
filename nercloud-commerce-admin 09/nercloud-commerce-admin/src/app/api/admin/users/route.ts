import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
const schema=z.object({name:z.string().min(2),email:z.string().email(),role:z.enum(["SUPER_ADMIN","BILLING_ADMIN","SUPPORT_ADMIN","VIEWER"]),passwordHash:z.string().min(20)});
export async function POST(req:NextRequest){
 try{
  const x=schema.parse(await req.json());
  const user=await db.adminUser.create({data:x});
  await db.adminAuditLog.create({data:{actorId:user.id,action:"CREATE",entity:"AdminUser",entityId:user.id,after:{email:user.email,role:user.role}}});
  return NextResponse.json({id:user.id,email:user.email,role:user.role},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"invalid request"},{status:400})}
}
