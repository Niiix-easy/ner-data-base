import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class BillingService {
  async rateCycle(cycleId: string) {
    // 1. Fetch Cycle
    const cycle = await prisma.billingCycle.findUnique({
      where: { id: cycleId }
    });

    if (!cycle) {
      throw new NotFoundException(`Billing cycle ${cycleId} not found`);
    }

    // Identificar a Subscription correspondente (Isso determina o Plano do Tenant)
    const subscription = await prisma.subscription.findUnique({
      where: { id: cycle.subscriptionId }
    });

    // 2. Perform aggregation and rating (Simplified for mock implementation)
    // In production we would query UsageAggregate records associated with this period
    // e.g., const usage = await prisma.usageAggregate.aggregate(...)

    let totalUsageCost = 0;
    let totalSubscriptionCost = 0;

    // Se possui uma subscription ativa, aplicamos a lógica de rate baseada no Plano (Tiered, Fixed, Overage)
    if (subscription) {
      // Fake rate plan fetch based on subscription.planVersionId
      totalSubscriptionCost = 2000; // $20.00 Fixed base fee

      // Calculate overage or tier units based on usage
      totalUsageCost = 5000; // $50.00 Overage usage fee
    }

    // 3. Mark Cycle as RATED
    await prisma.billingCycle.update({
      where: { id: cycleId },
      data: {
        status: 'RATED',
        ratedAt: new Date()
      }
    });

    // 4. Generate Invoice (Draft)
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: cycle.organizationId,
        billingCycleId: cycle.id,
        currency: 'USD',
        subtotal: BigInt(totalUsageCost + totalSubscriptionCost),
        tax: BigInt(0),
        discount: BigInt(0),
        total: BigInt(totalUsageCost + totalSubscriptionCost),
        status: 'DRAFT'
      }
    });

    return {
      success: true,
      cycleId,
      invoiceId: invoice.id,
      totalStr: invoice.total.toString(),
      status: 'RATED'
    };
  }
}
