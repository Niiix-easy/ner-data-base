import express from "express";
import { z } from "zod";
import { db } from "./db";
import { generateToken,hashToken } from "./security";

const app=express();
app.use(express.json());

const ssoSchema=z.object({
 organizationId:z.string(), name:z.string(), protocol:z.enum(["OIDC","SAML"]),
 issuer:z.string().url().optional(), clientId:z.string().optional(),
 authorizationUrl:z.string().url().optional(), tokenUrl:z.string().url().optional(),
 jwksUrl:z.string().url().optional(), metadataUrl:z.string().url().optional(),
 entityId:z.string().optional(), ssoUrl:z.string().url().optional(),
 certificatePem:z.string().optional(), domains:z.array(z.string()).default([])
});

app.post("/enterprise/sso",async(req,res)=>{
 try{
  const x=ssoSchema.parse(req.body);
  const row=await db.sSOConnection.create({data:{...x,domains:x.domains,status:"DISABLED"}});
  res.status(201).json(row);
 }catch(e){res.status(400).json({error:String(e)})}
});

const scimSchema=z.object({organizationId:z.string(),name:z.string(),baseUrl:z.string().url()});
app.post("/enterprise/scim",async(req,res)=>{
 try{
  const x=scimSchema.parse(req.body), token=generateToken();
  const row=await db.sCIMConnection.create({data:{...x,tokenHash:hashToken(token)}});
  res.status(201).json({connection:row,token});
 }catch(e){res.status(400).json({error:String(e)})}
});

app.get("/scim/v2.0/health",(_,res)=>res.json({schemas:["urn:ietf:params:scim:schemas:core:2.0"]}));

function requireScim(req:express.Request,res:express.Response,next:express.NextFunction){
 const auth=req.headers.authorization ?? "";
 if(!auth.startsWith("Bearer ")) return res.status(401).json({detail:"Missing SCIM bearer token"});
 const token=auth.slice(7);
 db.sCIMConnection.findMany({where:{active:true}}).then(rows=>{
  const hash=hashToken(token);
  const found=rows.find(x=>x.tokenHash===hash);
  if(!found) return res.status(401).json({detail:"Invalid SCIM token"});
  (req as any).scim=found;
  next();
 }).catch(()=>res.status(500).json({detail:"SCIM authentication error"}));
}

app.get("/scim/v2.0/Users",requireScim,async(req,res)=>{
 const c=(req as any).scim;
 const rows=await db.sCIMUser.findMany({where:{organizationId:c.organizationId},take:100});
 res.json({schemas:["urn:ietf:params:scim:api:messages:2.0:ListResponse"],totalResults:rows.length,Resources:rows.map(x=>({id:x.id,externalId:x.externalId,userName:x.userName,displayName:x.displayName,active:x.active,schemas:["urn:ietf:params:scim:schemas:core:2.0:User"]}))});
});

app.post("/scim/v2.0/Users",requireScim,async(req,res)=>{
 const c=(req as any).scim;
 const body=req.body;
 const row=await db.sCIMUser.upsert({
  where:{organizationId_externalId:{organizationId:c.organizationId,externalId:body.externalId ?? body.userName}},
  create:{organizationId:c.organizationId,externalId:body.externalId ?? body.userName,userName:body.userName,displayName:body.displayName,active:body.active ?? true,attributes:body},
  update:{userName:body.userName,displayName:body.displayName,active:body.active ?? true,attributes:body}
 });
 res.status(201).json(row);
});

app.patch("/scim/v2.0/Users/:id",requireScim,async(req,res)=>{
 const c=(req as any).scim;
 const row=await db.sCIMUser.update({where:{id:req.params.id},data:{active:req.body.active ?? true,displayName:req.body.displayName,attributes:req.body}});
 if(row.organizationId!==c.organizationId)return res.status(404).json({detail:"User not found"});
 res.json(row);
});

const slaSchema=z.object({
 organizationId:z.string(),name:z.string(),uptimeTargetBps:z.number().int().min(0).max(10000),
 responseTargetMinutes:z.number().int().positive(),resolutionTargetMinutes:z.number().int().positive(),
 startsAt:z.coerce.date(),endsAt:z.coerce.date().optional(),serviceCreditsJson:z.any().optional()
});
app.post("/enterprise/sla",async(req,res)=>{
 try{res.status(201).json(await db.sLA.create({data:slaSchema.parse(req.body)}))}
 catch(e){res.status(400).json({error:String(e)})}
});

const pricingSchema=z.object({
 organizationId:z.string(),contractId:z.string().optional(),productCode:z.string(),
 pricingType:z.enum(["FIXED","DISCOUNT","TIERED","COMMITMENT"]),currency:z.string().default("BRL"),
 unitAmountCents:z.number().int().nonnegative().optional(),minimumCommitmentCents:z.number().int().nonnegative().optional(),
 discountBps:z.number().int().min(0).max(10000).optional(),tiers:z.any().optional(),
 effectiveAt:z.coerce.date(),expiresAt:z.coerce.date().optional()
});
app.post("/enterprise/pricing",async(req,res)=>{
 try{res.status(201).json(await db.customPricing.create({data:pricingSchema.parse(req.body)}))}
 catch(e){res.status(400).json({error:String(e)})}
});

const contractSchema=z.object({
 organizationId:z.string(),name:z.string(),startsAt:z.coerce.date(),endsAt:z.coerce.date().optional(),
 autoRenew:z.boolean().default(false),currency:z.string().default("BRL"),notes:z.string().optional()
});
app.post("/enterprise/contracts",async(req,res)=>{
 try{res.status(201).json(await db.enterpriseContract.create({data:contractSchema.parse(req.body)}))}
 catch(e){res.status(400).json({error:String(e)})}
});

const infraSchema=z.object({
 organizationId:z.string(),name:z.string(),region:z.string(),environment:z.string(),
 provider:z.string(),clusterRef:z.string().optional(),networkRef:z.string().optional(),
 capacity:z.any().optional(),isolationLevel:z.string().default("dedicated")
});
app.post("/enterprise/infrastructure",async(req,res)=>{
 try{res.status(202).json(await db.dedicatedInfrastructure.create({data:infraSchema.parse(req.body)}))}
 catch(e){res.status(400).json({error:String(e)})}
});

app.get("/health",(_,res)=>res.json({ok:true,service:"nercloud-enterprise"}));
app.listen(Number(process.env.PORT??3030),()=>console.log("NERCloud Enterprise API on 3030"));
