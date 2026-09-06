import { z } from "zod";

export const EventEnvelope = z.object({
  id: z.string(),
  type: z.string(),
  version: z.number().int().positive(),
  occurredAt: z.string(),
  aggregate: z.object({ type: z.string(), id: z.string() }),
  payload: z.record(z.unknown()),
  traceId: z.string().optional(),
  correlationId: z.string().optional()
});
export type EventEnvelope = z.infer<typeof EventEnvelope>;

export const InvoiceCreated = z.object({
  invoiceId: z.string(),
  customerId: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.string()
});
