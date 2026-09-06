import { createConsumer, publish } from "../../../packages/events/src/kafka";
import { retryDelay, canRetry } from "../../../packages/events/src/retry";
import { db } from "../../../packages/db/src/client";
import { EventEnvelope } from "../../../packages/events/src/contracts";

const topic=process.env.KAFKA_TOPIC ?? "billing.events";
const retryTopic=process.env.KAFKA_RETRY_TOPIC ?? "billing.events.retry";
const dlqTopic=process.env.KAFKA_DLQ_TOPIC ?? "billing.events.dlq";
const consumerName=process.env.KAFKA_GROUP_ID ?? "nercloud-workers";

async function processEvent(raw:unknown){
 const event=EventEnvelope.parse(raw);
 switch(event.type){
  case "invoice.created":
   console.log("Processando invoice.created",event.payload);
   break;
  case "payment.succeeded":
   console.log("Processando payment.succeeded",event.payload);
   break;
  default:
   console.log("Evento sem handler:",event.type);
 }
}

async function main(){
 const consumer=await createConsumer(consumerName);
 await consumer.subscribe({topic,fromBeginning:false});
 console.log(`Worker conectado ao ${topic}`);
 await consumer.run({
  eachMessage:async ({topic,partition,message})=>{
   const eventId=message.headers?.["event-id"]?.toString() ?? `${topic}:${partition}:${message.offset}`;
   const value=message.value?.toString();
   if(!value)return;
   const existing=await db.processedEvent.findUnique({where:{consumer_eventId:{consumer:consumerName,eventId}}});
   if(existing){console.log("Ignorando evento duplicado",eventId);return;}
   try{
    await processEvent(JSON.parse(value));
    await db.processedEvent.create({data:{consumer:consumerName,eventId}});
   }catch(error){
    const attempts=Number(message.headers?.attempts?.toString() ?? "0")+1;
    const envelope={eventId,topic,partition,offset:message.offset,attempts,error:String(error),payload:JSON.parse(value)};
    if(canRetry(attempts)){
      await new Promise(r=>setTimeout(r,retryDelay(attempts)));
      await publish(retryTopic,eventId,envelope,{ "event-id":eventId, attempts:String(attempts) });
      console.error("Evento enviado para retry",envelope);
    }else{
      await publish(dlqTopic,eventId,envelope,{ "event-id":eventId, attempts:String(attempts) });
      await db.failedEvent.create({data:{eventId,consumer:consumerName,topic,partition,offset:message.offset,attempts,error:String(error),payload:JSON.parse(value)}});
      console.error("Evento enviado para DLQ",envelope);
    }
   }
  }
 });
}
main().catch(async e=>{console.error(e);await db.$disconnect();process.exit(1)});
