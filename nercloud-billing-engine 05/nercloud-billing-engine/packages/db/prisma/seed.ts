import {db} from "../src/client";
async function main(){
 const c=await db.coupon.upsert({where:{code:"WELCOME10"},update:{},create:{code:"WELCOME10",type:"PERCENT",value:10}});
 await db.tax.upsert({where:{key:"BR_DEFAULT"},update:{},create:{key:"BR_DEFAULT",name:"Imposto padrão",type:"PERCENT",rate:0}});
 console.log({coupon:c.code});
}
main().finally(()=>db.$disconnect());
