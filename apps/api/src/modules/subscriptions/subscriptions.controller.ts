import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  async getSubscriptions(@Query('organizationId') organizationId: string) {
    return this.subscriptionsService.getSubscriptions(organizationId);
  }

  @Post()
  async createSubscription(@Body() data: { organizationId: string; planVersionId: string }) {
    return this.subscriptionsService.createSubscription(data);
  }
}
