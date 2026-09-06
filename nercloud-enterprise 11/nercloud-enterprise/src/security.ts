import crypto from "node:crypto";

export function hashToken(token:string){
 const pepper=process.env.SCIM_TOKEN_PEPPER ?? "";
 return crypto.createHash("sha256").update(token+pepper).digest("hex");
}
export function generateToken(){
 return crypto.randomBytes(32).toString("base64url");
}
export function timingSafeEqualHex(a:string,b:string){
 const aa=Buffer.from(a,"hex"),bb=Buffer.from(b,"hex");
 return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}
