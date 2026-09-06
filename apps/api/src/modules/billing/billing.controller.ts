import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  async createCheckoutSession(@Body() body: any, @Request() req: any) {
    const { planName, organizationId } = body;
    // user will connect this manually to Stripe/MercadoPago SDKs
    // Returning dummy URL for now.
    return {
      success: true,
      url: `https://checkout.stripe.com/pay/cs_test_dummy_${planName}_${organizationId}`
    };
  }
}
