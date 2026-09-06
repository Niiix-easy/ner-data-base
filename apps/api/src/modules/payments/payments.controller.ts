import { Controller, Post, Body, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async processPayment(@Body() data: {
      organizationId: string;
      invoiceId: string;
      amount: number;
      method: string;
      provider?: string; // 'stripe', 'mercadopago', 'asaas', etc
  }) {
    return this.paymentsService.processPayment(data);
  }

  // Webhooks para provedores externos (Stripe, Mercado Pago)
  @Post('webhook/stripe')
  async stripeWebhook(@Body() payload: any, @Headers('stripe-signature') signature: string) {
    return this.paymentsService.handleWebhook('stripe', payload, signature);
  }

  @Post('webhook/mercadopago')
  async mercadoPagoWebhook(@Body() payload: any, @Headers('x-signature') signature: string) {
    return this.paymentsService.handleWebhook('mercadopago', payload, signature);
  }
}
