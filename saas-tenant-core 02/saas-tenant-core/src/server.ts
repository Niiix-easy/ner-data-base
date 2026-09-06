import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db";
import { hashPassword, comparePassword, signAccessToken, generateApiKey } from "./security";
import { authenticate, requirePermission, tenantId } from "./middleware/auth";
import { AuthRequest } from "./types";
import { z } from "zod";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/auth/register", async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(100),
    email: z.email(),
    password: z.string().min(8).max(128),
    organizationName: z.string().min(2).max(100)
  });
  const data = schema.parse(req.body);
  const email = data.email.toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already registered" });

  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: { name: data.name, email, passwordHash: await hashPassword(data.password) }
    });
    const org = await tx.organization.create({
      data: {
        name: data.organizationName,
        slug: `${data.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`
      }
    });
    const role = await tx.role.findFirst({ where: { system: true, name: "owner" } });
    if (!role) throw new Error("Owner role not seeded");
    const membership = await tx.membership.create({
      data: { userId: user.id, organizationId: org.id, roleId: role.id }
    });
    return { user, org, membership };
  });

  const token = signAccessToken({ userId: result.user.id });
  res.status(201).json({
    accessToken: token,
    user: { id: result.user.id, name: result.user.name, email: result.user.email },
    organization: result.org
  });
});

app.post("/auth/login", async (req, res) => {
  const schema = z.object({ email: z.email(), password: z.string().min(1) });
  const data = schema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user || !user.isActive || !(await comparePassword(data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signAccessToken({ userId: user.id });
  res.json({ accessToken: token, user: { id: user.id, name: user.name, email: user.email } });
});

app.use(authenticate);

app.get("/me", async (req: AuthRequest, res) => {
  const m = await prisma.membership.findUnique({
    where: { id: req.auth!.membershipId },
    include: { user: true, organization: true, role: true }
  });
  res.json({ user: m?.user, organization: m?.organization, membership: m?.role, permissions: req.auth!.permissions });
});

app.get("/organizations", async (req: AuthRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.auth!.id, status: "ACTIVE" },
    include: { organization: true, role: true },
    orderBy: { createdAt: "asc" }
  });
  res.json(memberships.map(m => ({ ...m.organization, role: m.role.name, membershipId: m.id })));
});

app.get("/organizations/current", requirePermission("org.read"), async (req: AuthRequest, res) => {
  const org = await prisma.organization.findUnique({ where: { id: tenantId(req) } });
  res.json(org);
});

app.patch("/organizations/current", requirePermission("org.update"), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(2).max(100).optional() });
  const data = schema.parse(req.body);
  const org = await prisma.organization.update({
    where: { id: tenantId(req) },
    data
  });
  await prisma.auditLog.create({
    data: { organizationId: tenantId(req), userId: req.auth!.id, action: "organization.update", resource: "organization", resourceId: org.id, metadata: data }
  });
  res.json(org);
});

app.get("/members", requirePermission("members.read"), async (req: AuthRequest, res) => {
  const members = await prisma.membership.findMany({
    where: { organizationId: tenantId(req) },
    include: { user: { select: { id: true, name: true, email: true, isActive: true } }, role: true },
    orderBy: { createdAt: "asc" }
  });
  res.json(members);
});

app.post("/members", requirePermission("members.invite"), async (req: AuthRequest, res) => {
  const schema = z.object({
    email: z.email(),
    name: z.string().min(2).max(100),
    password: z.string().min(8).max(128),
    roleId: z.string()
  });
  const data = schema.parse(req.body);
  const orgId = tenantId(req);

  const role = await prisma.role.findFirst({ where: { id: data.roleId, OR: [{ organizationId: orgId }, { organizationId: null, system: true }] } });
  if (!role) return res.status(400).json({ error: "Role does not belong to tenant" });

  const result = await prisma.$transaction(async tx => {
    let user = await tx.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (!user) {
      user = await tx.user.create({
        data: { name: data.name, email: data.email.toLowerCase(), passwordHash: await hashPassword(data.password) }
      });
    }
    const membership = await tx.membership.create({
      data: { userId: user.id, organizationId: orgId, roleId: role.id }
    });
    return { membership, user };
  });

  await prisma.auditLog.create({
    data: { organizationId: orgId, userId: req.auth!.id, action: "member.create", resource: "membership", resourceId: result.membership.id }
  });
  res.status(201).json(result);
});

app.patch("/members/:id", requirePermission("members.update"), async (req: AuthRequest, res) => {
  const schema = z.object({ roleId: z.string().optional(), status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]).optional() });
  const data = schema.parse(req.body);
  const orgId = tenantId(req);

  const existing = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: orgId } });
  if (!existing) return res.status(404).json({ error: "Member not found" });

  if (data.roleId) {
    const role = await prisma.role.findFirst({ where: { id: data.roleId, OR: [{ organizationId: orgId }, { organizationId: null, system: true }] } });
    if (!role) return res.status(400).json({ error: "Role does not belong to tenant" });
  }

  const updated = await prisma.membership.update({ where: { id: existing.id }, data });
  res.json(updated);
});

app.delete("/members/:id", requirePermission("members.remove"), async (req: AuthRequest, res) => {
  const orgId = tenantId(req);
  const existing = await prisma.membership.findFirst({ where: { id: req.params.id, organizationId: orgId } });
  if (!existing) return res.status(404).json({ error: "Member not found" });
  if (existing.userId === req.auth!.id) return res.status(400).json({ error: "You cannot remove yourself" });
  await prisma.membership.delete({ where: { id: existing.id } });
  res.status(204).send();
});

app.get("/roles", requirePermission("roles.read"), async (req: AuthRequest, res) => {
  const roles = await prisma.role.findMany({
    where: { OR: [{ organizationId: tenantId(req) }, { organizationId: null, system: true }] },
    include: { permissions: { include: { permission: true } } }
  });
  res.json(roles);
});

app.post("/roles", requirePermission("roles.manage"), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(2).max(50), description: z.string().max(255).optional(), permissionKeys: z.array(z.string()).default([]) });
  const data = schema.parse(req.body);
  const orgId = tenantId(req);

  const permissions = await prisma.permission.findMany({ where: { key: { in: data.permissionKeys } } });
  if (permissions.length !== data.permissionKeys.length) return res.status(400).json({ error: "Unknown permission" });

  const role = await prisma.$transaction(async tx => {
    const r = await tx.role.create({ data: { name: data.name, description: data.description, organizationId: orgId } });
    await tx.rolePermission.createMany({ data: permissions.map(p => ({ roleId: r.id, permissionId: p.id })) });
    return tx.role.findUnique({ where: { id: r.id }, include: { permissions: { include: { permission: true } } } });
  });
  res.status(201).json(role);
});

app.get("/permissions", requirePermission("roles.read"), async (_, res) => {
  res.json(await prisma.permission.findMany({ orderBy: { key: "asc" } }));
});

app.get("/api-keys", requirePermission("api_keys.read"), async (req: AuthRequest, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { organizationId: tenantId(req) },
    select: { id: true, name: true, prefix: true, status: true, lastUsedAt: true, expiresAt: true, createdAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(keys);
});

app.post("/api-keys", requirePermission("api_keys.manage"), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(2).max(100), expiresAt: z.coerce.date().optional() });
  const data = schema.parse(req.body);
  const generated = generateApiKey();
  const key = await prisma.apiKey.create({
    data: {
      name: data.name,
      prefix: generated.prefix,
      secretHash: generated.hash,
      userId: req.auth!.id,
      organizationId: tenantId(req),
      expiresAt: data.expiresAt
    }
  });
  await prisma.auditLog.create({
    data: { organizationId: tenantId(req), userId: req.auth!.id, action: "api_key.create", resource: "api_key", resourceId: key.id }
  });
  res.status(201).json({ id: key.id, name: key.name, prefix: key.prefix, apiKey: generated.raw, expiresAt: key.expiresAt });
});

app.post("/api-keys/:id/revoke", requirePermission("api_keys.manage"), async (req: AuthRequest, res) => {
  const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, organizationId: tenantId(req) } });
  if (!key) return res.status(404).json({ error: "API key not found" });
  const updated = await prisma.apiKey.update({
    where: { id: key.id },
    data: { status: "REVOKED", revokedAt: new Date() },
    select: { id: true, name: true, prefix: true, status: true, revokedAt: true }
  });
  res.json(updated);
});

app.get("/audit-logs", requirePermission("audit.read"), async (req: AuthRequest, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: tenantId(req) },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json(logs);
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === "ZodError") return res.status(400).json({ error: "Validation error", details: err.issues });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
