import { PrismaClient, UserRole } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@neercloud.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrador",
      role: UserRole.ADMIN
    }
  });

  await prisma.project.upsert({
    where: { slug: "neercloud" },
    update: {},
    create: {
      name: "NeerCloud",
      slug: "neercloud",
      description: "Projeto principal",
      members: { create: { userId: user.id } }
    }
  });

  console.log(`Seed concluído: ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
