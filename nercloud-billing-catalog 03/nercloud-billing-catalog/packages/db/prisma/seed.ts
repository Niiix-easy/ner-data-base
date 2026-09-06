import { db } from "../src/client";

async function main() {
  const meter = await db.meter.upsert({
    where: { key: "api_requests" },
    update: {},
    create: { key: "api_requests", name: "API Requests", unit: "request", aggregation: "SUM" }
  });

  const product = await db.product.upsert({
    where: { key: "nercloud" },
    update: {},
    create: { key: "nercloud", name: "NERCloud", description: "Produto principal da plataforma" }
  });

  const plan = await db.plan.upsert({
    where: { productId_key: { productId: product.id, key: "pro" } },
    update: {},
    create: { productId: product.id, key: "pro", name: "Pro", description: "Plano profissional" }
  });

  const version = await db.planVersion.upsert({
    where: { planId_version: { planId: plan.id, version: 1 } },
    update: {},
    create: { planId: plan.id, version: 1, status: "ACTIVE", effectiveAt: new Date() }
  });

  await db.price.upsert({
    where: { planVersionId_key: { planVersionId: version.id, key: "monthly" } },
    update: {},
    create: {
      planVersionId: version.id, key: "monthly", name: "Pro Mensal",
      type: "RECURRING", currency: "BRL", unitAmount: 9900,
      interval: "MONTH", intervalCount: 1
    }
  });

  await db.entitlement.upsert({
    where: { planVersionId_key: { planVersionId: version.id, key: "api_requests" } },
    update: {},
    create: {
      planVersionId: version.id, meterId: meter.id, key: "api_requests",
      name: "API Requests incluídas", includedAmount: 100000
    }
  });

  console.log("Billing catalog seed concluído.");
}

main().finally(() => db.$disconnect());
