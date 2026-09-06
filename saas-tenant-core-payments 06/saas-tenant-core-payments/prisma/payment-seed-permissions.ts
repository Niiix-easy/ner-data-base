import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const permissions = [
  ["payments.create", "Create payments"],
  ["payments.read", "Read payments"],
  ["payments.methods.manage", "Create/manage payment methods"],
  ["payments.methods.read", "Read payment methods"],
  ["payments.refunds.manage", "Create refunds"],
  ["payments.refunds.read", "Read refunds"],
  ["payments.disputes.read", "Read disputes"],
  ["payments.disputes.manage", "Manage disputes"],
  ["payments.providers.manage", "Manage payment providers"]
];

async function main() {
  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description }
    });
  }
}
main().finally(() => prisma.$disconnect());
