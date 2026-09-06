import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UsageLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Assuming organizationId is injected into the request (e.g. by AuthGuard)
    const organizationId = request.user?.organizationId || request.body.organizationId || request.query.organizationId;

    if (!organizationId) {
      return true; // Or throw error depending on auth setup
    }

    // 1. Get active subscription
    const activeSub = await prisma.subscription.findFirst({
      where: {
        organizationId: organizationId,
        status: { in: ['ACTIVE', 'TRIALING'] }
      }
    });

    if (!activeSub) {
      throw new ForbiddenException('No active subscription found. Please upgrade to continue.');
    }

    // Use planVersionId directly, as the relation might be missing depending on schema version
    const entitlements = await prisma.entitlement.findMany({
      where: { planVersionId: activeSub.planVersionId }
    });

    // 2. Determine what action is being performed
    const path = request.route.path;
    const method = request.method;

    // Example logic for Storage Usage Limit
    // In a real app this would intercept storage upload requests
    if (path.includes('/storage') && method === 'POST') {
      const storageLimitEntitlement = entitlements.find(e => e.meterId === 'meter_storage');
      if (storageLimitEntitlement) {

        // Sum up usage records to get current total storage
        const usage = await prisma.usageAggregate.aggregate({
            _sum: { quantity: true },
            where: {
                organizationId,
                meterId: 'meter_storage'
            }
        });

        const currentStorage = Number(usage._sum.quantity || 0);

        if (currentStorage >= Number(storageLimitEntitlement.limit)) {
          throw new ForbiddenException(`Storage limit reached (${storageLimitEntitlement.limit} bytes). Please upgrade your plan or delete unused files.`);
        }
      }
    }

    // Project creation limit
    if (path.includes('/projects') && method === 'POST') {
      const projectLimitEntitlement = entitlements.find(e => e.meterId === 'meter_projects');
      if (projectLimitEntitlement) {
        const projectCount = await prisma.project.count({
          where: { organizationId: organizationId, status: { not: 'DELETED' } }
        });
        if (projectCount >= Number(projectLimitEntitlement.limit)) {
          throw new ForbiddenException(`Project limit reached (${projectLimitEntitlement.limit}). Please upgrade your plan.`);
        }
      }
    }

    return true;
  }
}
