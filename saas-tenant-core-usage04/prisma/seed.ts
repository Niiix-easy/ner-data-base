import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissions = [
  ["org.read", "View organization"],
  ["org.update", "Update organization"],
  ["members.read", "View members"],
  ["members.invite", "Invite members"],
  ["members.update", "Update member roles/status"],
  ["members.remove", "Remove members"],
  ["roles.read", "View roles"],
  ["roles.manage", "Create/update roles"],
  ["api_keys.read", "View API keys"],
  ["api_keys.manage", "Create/revoke API keys"],
  ["audit.read", "View audit logs"],
  ["usage.read", "View usage"],
  ["usage.write", "Record usage events and adjustments"],
  ["usage.manage", "Manage meters and limits"]
];

async function main() {
  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description }
    });
  }

  const ownerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: null, name: "owner" } },
    update: {},
    create: { name: "owner", description: "Organization owner", system: true }
  });

  const adminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: null, name: "admin" } },
    update: {},
    create: { name: "admin", description: "Organization administrator", system: true }
  });

  const memberRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: null, name: "member" } },
    update: {},
    create: { name: "member", description: "Standard member", system: true }
  });

  const all = await prisma.permission.findMany();
  for (const role of [ownerRole, adminRole]) {
    for (const p of all) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
        update: {},
        create: { roleId: role.id, permissionId: p.id }
      });
    }
  }
  const memberPermissions = ["org.read", "members.read", "roles.read", "usage.read"];
  for (const key of memberPermissions) {
    const p = all.find(x => x.key === key)!;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: memberRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: memberRole.id, permissionId: p.id }
    });
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "System Admin", passwordHash }
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Organization", slug: "demo" }
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { roleId: ownerRole.id, status: "ACTIVE" },
    create: { userId: user.id, organizationId: org.id, roleId: ownerRole.id }
  });

  console.log("Seed complete: admin@example.com / ChangeMe123!");
}

main().finally(() => prisma.$disconnect());
