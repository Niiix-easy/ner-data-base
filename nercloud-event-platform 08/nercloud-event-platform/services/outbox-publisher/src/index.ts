import { db } from "../../../packages/db/src/client";
import { publish } from "../../../packages/events/src/kafka";

const batchSize=Number(process.env.OUTBOX_BATCH_SIZE ?? 50);

async function claimAndPublish(){
 const events=await db.outboxEvent.findMany({
  where:{status:"PENDING",availableAt:{lte:new Date()}},
  orderBy:{createdAt:"asc"},take:batchSize
 });
 for(const event of events){
  try{
   await db.outboxEvent.update({where:{id:event.id},data:{attempts:{increment:1}}});
   await publish(event.topic,event.eventKey,event.payload,{
    "event-id":event.id,"event-type":event.eventType
   });
   await db.outboxEvent.update({where:{id:event.id},data:{status:"PUBLISHED",publishedAt:new Date(),lastError:null}});
  }catch(error){
   await db.outboxEvent.update({
    where:{id:event.id},
    data:{status:"PENDING",availableAt:new Date(Date.now()+Math.min(1000*2**event.attempts,60000)),lastError:String(error)}
   });
  }
 }
}
async function main(){
 console.log("NERCloud outbox publisher started");
 while(true){
  await claimAndPublish();
  await new Promise(r=>setTimeout(r,500));
 }
}
main().catch(async e=>{console.error(e);await db.$disconnect();process.exit(1)});
