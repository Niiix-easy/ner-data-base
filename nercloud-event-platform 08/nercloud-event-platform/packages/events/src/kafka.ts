import { Kafka, Producer, Consumer, EachMessagePayload } from "kafkajs";

const brokers=(process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
export const kafka = new Kafka({
 clientId: process.env.KAFKA_CLIENT_ID ?? "nercloud",
 brokers
});

let producer: Producer | undefined;
export async function getProducer(){
 if(!producer){
  producer=kafka.producer({allowAutoTopicCreation:false});
  await producer.connect();
 }
 return producer;
}

export async function createConsumer(groupId=process.env.KAFKA_GROUP_ID ?? "nercloud-workers"){
 const c=kafka.consumer({groupId});
 await c.connect();
 return c;
}

export async function publish(topic:string,key:string,value:unknown,headers:Record<string,string>={}){
 const p=await getProducer();
 await p.send({topic,messages:[{
  key,value:JSON.stringify(value),
  headers:Object.fromEntries(Object.entries(headers).map(([k,v])=>[k,Buffer.from(v)]))
 }]});
}
