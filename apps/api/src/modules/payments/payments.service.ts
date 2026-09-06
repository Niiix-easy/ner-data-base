import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  async processPayment(data: {
      organizationId: string;
      invoiceId: string;
      amount: number;
      method: string;
      provider?: string;
  }) {
      // 1. Validate Invoice
      const invoice = await prisma.invoice.findUnique({
          where: { id: data.invoiceId }
      });

      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.status === 'PAID') throw new BadRequestException('Invoice already paid');

      // Aqui você injetaria a lógica do provedor real com base em data.provider
      // ex: if(data.provider === 'stripe') { const intent = await stripe.paymentIntents.create(...) }
      const provider = data.provider || 'mock_provider';

      // 2. Registra a intenção ou processo de pagamento
      const payment = await prisma.payment.create({
          data: {
              organizationId: data.organizationId,
              invoiceId: invoice.id,
              amount: BigInt(data.amount),
              currency: invoice.currency,
              status: provider === 'mock_provider' ? 'SUCCEEDED' : 'PENDING',
              provider: provider,
              providerId: `tx_${Date.now()}` // Mock tx id para provedores reais retornarem via webhook
          }
      });

      // 3. Mark Invoice as paid se foi via mock
      if (payment.status === 'SUCCEEDED') {
          await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: 'PAID' }
          });

          await prisma.billingCycle.updateMany({
              where: { id: invoice.billingCycleId },
              data: { status: 'CLOSED', closedAt: new Date() }
          });
      }

      return {
          ...payment,
          amount: payment.amount.toString()
      };
  }

  // Rota universal para receber callbacks dos gateways
  async handleWebhook(provider: string, payload: any, signature: string) {
      this.logger.log(`Received webhook from ${provider}`);

      // 1. Verificar Assinatura (Ex: Stripe const event = stripe.webhooks.constructEvent(...))
      // 2. Extrair PaymentIntentId / Transation ID
      // 3. Buscar no DB: const payment = await prisma.payment.findFirst({ where: { providerId: txId } })
      // 4. Se 'payment_intent.succeeded' -> Atualizar Invoice -> Atualizar BillingCycle -> Atualizar Payment

      return { received: true, provider };
  }
}
