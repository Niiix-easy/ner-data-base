import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SubscriptionsService {
  async getSubscriptions(organizationId: string) {
      return prisma.subscription.findMany({
          where: { organizationId }
      });
  }

  async createSubscription(data: { organizationId: string; planVersionId: string }) {
      // 1. Create Subscription
      const sub = await prisma.subscription.create({
          data: {
              organizationId: data.organizationId,
              planVersionId: data.planVersionId,
              status: 'ACTIVE'
          }
      });

      // 2. Initialize first Billing Cycle
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);

      await prisma.billingCycle.create({
          data: {
              organizationId: data.organizationId,
              subscriptionId: sub.id,
              periodStart: now,
              periodEnd: nextMonth,
              status: 'OPEN'
          }
      });

      return sub;
  }
}
