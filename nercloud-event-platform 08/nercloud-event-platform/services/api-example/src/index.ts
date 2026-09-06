import express from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../../../packages/db/src/client";

const app=express();
app.use(express.json());

const schema=z.object({
 invoiceId:z.string(),
 customerId:z.string(),
 totalCents:z.number().int().nonnegative(),
 currency:z.string().default("BRL")
});

app.post("/events/invoice-created",async(req,res)=>{
 try{
  const x=schema.parse(req.body);
  const event=await db.$transaction(async tx=>{
   const id=randomUUID();
   return tx.outboxEvent.create({
    data:{
     id,aggregateType:"Invoice",aggregateId:x.invoiceId,
     eventType:"invoice.created",topic:process.env.KAFKA_TOPIC ?? "billing.events",
     eventKey:x.invoiceId,
     payload:{id,type:"invoice.created",version:1,occurredAt:new Date().toISOString(),aggregate:{type:"Invoice",id:x.invoiceId},payload:x}
    }
   });
  });
  res.status(202).json({accepted:true,eventId:event.id});
 }catch(e){res.status(400).json({error:String(e)})}
});

app.get("/health",(_,res)=>res.json({ok:true}));
app.listen(Number(process.env.PORT ?? 3020),()=>console.log("Event API on 3020"));
