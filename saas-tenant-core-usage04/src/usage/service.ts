import { MeterAggregation, Prisma } from "@prisma/client";
import { prisma } from "../db";

type Period = { start: Date; end: Date };

export function getPeriod(start?: Date, end?: Date): Period {
  const s = start ?? new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const e = end ?? new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1));
  if (s >= e) throw new Error("periodStart must be before periodEnd");
  return { start: s, end: e };
}

export async function assertMeter(organizationId: string, meterId: string) {
  const meter = await prisma.meter.findFirst({ where: { id: meterId, organizationId, active: true } });
  if (!meter) throw new Error("Meter not found or inactive");
  return meter;
}

export async function recordEvent(input: {
  organizationId: string; meterId: string; userId?: string; externalId?: string;
  idempotencyKey: string; value: number; occurredAt?: Date; metadata?: Prisma.InputJsonValue;
}) {
  if (!Number.isFinite(input.value) || input.value < 0) throw new Error("value must be a finite non-negative number");
  await assertMeter(input.organizationId, input.meterId);
  const existing = await prisma.usageEvent.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey } }
  });
  if (existing) return { event: existing, duplicate: true };
  const event = await prisma.usageEvent.create({ data: input });
  return { event, duplicate: false };
}

async function calculateRaw(organizationId: string, meterId: string, period: Period) {
  const meter = await assertMeter(organizationId, meterId);
  const events = await prisma.usageEvent.findMany({
    where: { organizationId, meterId, status: "ACCEPTED", occurredAt: { gte: period.start, lt: period.end } },
    select: { value: true, occurredAt: true }
  });
  const adjustments = await prisma.usageAdjustment.findMany({
    where: { organizationId, meterId, effectiveAt: { gte: period.start, lt: period.end } },
    select: { value: true }
  });
  const adjustmentValue = adjustments.reduce((a, x) => a + x.value, 0);
  let value = 0;
  switch (meter.aggregation) {
    case MeterAggregation.SUM: value = events.reduce((a, x) => a + x.value, 0); break;
    case MeterAggregation.COUNT: value = events.length; break;
    case MeterAggregation.MAX: value = events.length ? Math.max(...events.map(x => x.value)) : 0; break;
    case MeterAggregation.LAST: value = events.length ? [...events].sort((a,b) => a.occurredAt.getTime()-b.occurredAt.getTime()).at(-1)!.value : 0; break;
  }
  return { meter, eventCount: events.length, value: Math.max(0, value + adjustmentValue), adjustmentValue };
}

export async function aggregate(input: { organizationId: string; meterId: string; periodStart?: Date; periodEnd?: Date }) {
  const period = getPeriod(input.periodStart, input.periodEnd);
  const raw = await calculateRaw(input.organizationId, input.meterId, period);
  const aggregation = await prisma.usageAggregation.upsert({
    where: { organizationId_meterId_periodStart_periodEnd: { organizationId: input.organizationId, meterId: input.meterId, periodStart: period.start, periodEnd: period.end } },
    update: { value: raw.value, eventCount: raw.eventCount, adjustmentValue: raw.adjustmentValue, calculatedAt: new Date() },
    create: { organizationId: input.organizationId, meterId: input.meterId, periodStart: period.start, periodEnd: period.end, value: raw.value, eventCount: raw.eventCount, adjustmentValue: raw.adjustmentValue }
  });
  return { aggregation, meter: raw.meter };
}

export async function calculateOverage(input: { organizationId: string; meterId: string; periodStart?: Date; periodEnd?: Date; persist?: boolean }) {
  const period = getPeriod(input.periodStart, input.periodEnd);
  const { aggregation, meter } = await aggregate(input);
  const limit = await prisma.usageLimit.findFirst({
    where: { organizationId: input.organizationId, meterId: input.meterId, active: true, periodStart: { lte: period.start }, periodEnd: { gte: period.end } },
    orderBy: { createdAt: "desc" }
  });
  const included = limit?.includedUnits ?? 0;
  const overageUnits = Math.max(0, aggregation.value - included);
  const unitPrice = limit?.overageUnitPrice ?? 0;
  const amount = Number((overageUnits * unitPrice).toFixed(6));
  const result = { organizationId: input.organizationId, meterId: input.meterId, meterKey: meter.key, periodStart: period.start, periodEnd: period.end, usageValue: aggregation.value, includedUnits: included, overageUnits, unitPrice, amount, hardLimitUnits: limit?.hardLimitUnits ?? null, mode: limit?.mode ?? null };
  if (!input.persist) return result;
  const saved = await prisma.usageOverage.upsert({
    where: { organizationId_meterId_periodStart_periodEnd: { organizationId: input.organizationId, meterId: input.meterId, periodStart: period.start, periodEnd: period.end } },
    update: { limitId: limit?.id, usageValue: aggregation.value, includedUnits: included, overageUnits, unitPrice, amount },
    create: { organizationId: input.organizationId, meterId: input.meterId, limitId: limit?.id, periodStart: period.start, periodEnd: period.end, usageValue: aggregation.value, includedUnits: included, overageUnits, unitPrice, amount }
  });
  return saved;
}

export async function enforceHardLimit(input: { organizationId: string; meterId: string; value: number; occurredAt: Date }) {
  const limit = await prisma.usageLimit.findFirst({
    where: { organizationId: input.organizationId, meterId: input.meterId, active: true, periodStart: { lte: input.occurredAt }, periodEnd: { gt: input.occurredAt }, mode: "HARD" },
    orderBy: { createdAt: "desc" }
  });
  if (!limit?.hardLimitUnits) return;
  const raw = await calculateRaw(input.organizationId, input.meterId, { start: limit.periodStart, end: limit.periodEnd });
  if (raw.value + input.value > limit.hardLimitUnits) throw new Error("Hard usage limit exceeded");
}
