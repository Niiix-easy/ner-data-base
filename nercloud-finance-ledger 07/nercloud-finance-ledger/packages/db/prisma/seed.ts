import {db} from "../src/client";
async function main(){
 const accounts=[
  ["1000","Cash","ASSET","DEBIT"],["1100","Accounts Receivable","ASSET","DEBIT"],
  ["2000","Accounts Payable","LIABILITY","CREDIT"],["3000","Equity","EQUITY","CREDIT"],
  ["4000","Revenue","REVENUE","CREDIT"],["5000","Operating Expenses","EXPENSE","DEBIT"]
 ];
 for(const [code,name,type,normalBalance] of accounts)await db.ledgerAccount.upsert({where:{code},update:{},create:{code,name,type:type as any,normalBalance:normalBalance as any}});
 console.log("Plano de contas criado.");
}
main().finally(()=>db.$disconnect());
