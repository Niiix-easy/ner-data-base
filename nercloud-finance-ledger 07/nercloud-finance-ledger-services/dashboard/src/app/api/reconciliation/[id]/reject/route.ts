import {db} from "@neercloud/db"; type C={params:Promise<{id:string}>};
export async function POST(_:Request,c:C){const{id}=await c.params;const data=await db.externalTransaction.update({where:{id},data:{status:"REJECTED"}});await db.auditLog.create({data:{action:"RECONCILE",entityType:"ExternalTransaction",entityId:id,after:data}});return Response.json({data})}
