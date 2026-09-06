import {db} from "@neercloud/db";
export async function GET(){return Response.json({data:await db.externalTransaction.findMany({include:{account:true},orderBy:{occurredAt:"desc"}})})}
