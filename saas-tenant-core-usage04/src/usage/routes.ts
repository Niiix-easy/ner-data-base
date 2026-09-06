import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { AuthRequest } from "../types";
import { requirePermission, tenantId } from "../middleware/auth";
import { aggregate, calculateOverage, enforceHardLimit, recordEvent } from "./service";

const router = Router();
const id = z.string().min(1);
const date = z.coerce.date();

router.get("/meters", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const meters = await prisma.meter.findMany({ where: { organizationId: tenantId(req) }, orderBy: { createdAt: "asc" } });
  res.json(meters);
});

router.post("/meters", requirePermission("usage.manage"), async (req: AuthRequest, res) => {
  const data = z.object({ key: z.string().regex(/^[a-z0-9][a-z0-9_.-]{1,63}$/), name: z.string().min(2).max(100), description: z.string().max(500).optional(), unit: z.string().min(1).max(30), aggregation: z.enum(["SUM","COUNT","MAX","LAST"]).default("SUM") }).parse(req.body);
  const meter = await prisma.meter.create({ data: { ...data, organizationId: tenantId(req) } });
  res.status(201).json(meter);
});

router.patch("/meters/:meterId", requirePermission("usage.manage"), async (req: AuthRequest, res) => {
  const data = z.object({ name: z.string().min(2).max(100).optional(), description: z.string().max(500).optional(), unit: z.string().min(1).max(30).optional(), aggregation: z.enum(["SUM","COUNT","MAX","LAST"]).optional(), active: z.boolean().optional() }).parse(req.body);
  const meter = await prisma.meter.updateMany({ where: { id: req.params.meterId, organizationId: tenantId(req) }, data });
  if (!meter.count) return res.status(404).json({ error: "Meter not found" });
  res.json(await prisma.meter.findFirst({ where: { id: req.params.meterId, organizationId: tenantId(req) } }));
});

router.post("/events", requirePermission("usage.write"), async (req: AuthRequest, res) => {
  const data = z.object({ meterId: id, idempotencyKey: z.string().min(8).max(200), value: z.number().finite().nonnegative(), externalId: z.string().max(200).optional(), occurredAt: date.optional(), metadata: z.record(z.string(), z.any()).optional() }).parse(req.body);
  const occurredAt = data.occurredAt ?? new Date();
  try { await enforceHardLimit({ organizationId: tenantId(req), meterId: data.meterId, value: data.value, occurredAt }); }
  catch (e) { return res.status(429).json({ error: e instanceof Error ? e.message : "Usage limit exceeded" }); }
  try {
    const result = await recordEvent({ ...data, organizationId: tenantId(req), userId: req.auth!.id, occurredAt, metadata: data.metadata });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : "Unable to record event" }); }
});

router.get("/events", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const q = z.object({ meterId: id.optional(), start: date.optional(), end: date.optional(), limit: z.coerce.number().int().min(1).max(1000).default(100) }).parse(req.query);
  const events = await prisma.usageEvent.findMany({ where: { organizationId: tenantId(req), meterId: q.meterId, occurredAt: { ...(q.start ? { gte: q.start } : {}), ...(q.end ? { lt: q.end } : {}) } }, orderBy: { occurredAt: "desc" }, take: q.limit });
  res.json(events);
});

router.post("/adjustments", requirePermission("usage.write"), async (req: AuthRequest, res) => {
  const data = z.object({ meterId: id, value: z.number().finite(), reason: z.string().min(2).max(500), effectiveAt: date.optional(), metadata: z.record(z.string(), z.any()).optional() }).parse(req.body);
  const meter = await prisma.meter.findFirst({ where: { id: data.meterId, organizationId: tenantId(req), active: true } });
  if (!meter) return res.status(404).json({ error: "Meter not found" });
  const adjustment = await prisma.usageAdjustment.create({ data: { ...data, organizationId: tenantId(req), userId: req.auth!.id, effectiveAt: data.effectiveAt ?? new Date() } });
  res.status(201).json(adjustment);
});

router.get("/adjustments", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const q = z.object({ meterId: id.optional(), start: date.optional(), end: date.optional() }).parse(req.query);
  res.json(await prisma.usageAdjustment.findMany({ where: { organizationId: tenantId(req), meterId: q.meterId, effectiveAt: { ...(q.start ? { gte: q.start } : {}), ...(q.end ? { lt: q.end } : {}) } }, orderBy: { effectiveAt: "desc" }, take: 1000 }));
});

router.post("/limits", requirePermission("usage.manage"), async (req: AuthRequest, res) => {
  const data = z.object({ meterId: id, periodStart: date, periodEnd: date, includedUnits: z.number().finite().nonnegative().default(0), hardLimitUnits: z.number().finite().nonnegative().optional(), overageUnitPrice: z.number().finite().nonnegative().default(0), mode: z.enum(["SOFT","HARD"]).default("SOFT") }).parse(req.body);
  if (data.periodStart >= data.periodEnd) return res.status(400).json({ error: "Invalid period" });
  if (data.mode === "HARD" && data.hardLimitUnits === undefined) return res.status(400).json({ error: "hardLimitUnits is required for HARD limits" });
  const meter = await prisma.meter.findFirst({ where: { id: data.meterId, organizationId: tenantId(req) } });
  if (!meter) return res.status(404).json({ error: "Meter not found" });
  const limit = await prisma.usageLimit.create({ data: { ...data, organizationId: tenantId(req) } });
  res.status(201).json(limit);
});

router.get("/limits", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const meterId = typeof req.query.meterId === "string" ? req.query.meterId : undefined;
  res.json(await prisma.usageLimit.findMany({ where: { organizationId: tenantId(req), meterId }, orderBy: { periodStart: "desc" } }));
});

router.post("/aggregate", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const data = z.object({ meterId: id, periodStart: date.optional(), periodEnd: date.optional() }).parse(req.body);
  res.json(await aggregate({ organizationId: tenantId(req), ...data }));
});

router.get("/aggregation", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const q = z.object({ meterId: id, start: date, end: date }).parse(req.query);
  res.json(await aggregate({ organizationId: tenantId(req), meterId: q.meterId, periodStart: q.start, periodEnd: q.end }));
});

router.post("/overage/calculate", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const data = z.object({ meterId: id, periodStart: date.optional(), periodEnd: date.optional(), persist: z.boolean().default(false) }).parse(req.body);
  res.json(await calculateOverage({ organizationId: tenantId(req), ...data }));
});

router.get("/overage", requirePermission("usage.read"), async (req: AuthRequest, res) => {
  const q = z.object({ meterId: id.optional(), status: z.enum(["OPEN","INVOICED","VOID"]).optional() }).parse(req.query);
  res.json(await prisma.usageOverage.findMany({ where: { organizationId: tenantId(req), meterId: q.meterId, status: q.status }, orderBy: { periodStart: "desc" }, take: 1000 }));
});

router.post("/overage/:id/status", requirePermission("usage.manage"), async (req: AuthRequest, res) => {
  const data = z.object({ status: z.enum(["OPEN","INVOICED","VOID"]) }).parse(req.body);
  const updated = await prisma.usageOverage.updateMany({ where: { id: req.params.id, organizationId: tenantId(req) }, data: { status: data.status } });
  if (!updated.count) return res.status(404).json({ error: "Overage not found" });
  res.json(await prisma.usageOverage.findFirst({ where: { id: req.params.id, organizationId: tenantId(req) } }));
});

export default router;
