import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class InvoicesService {
  async getInvoices(organizationId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return invoices.map(inv => ({
      ...inv,
      subtotal: inv.subtotal.toString(),
      tax: inv.tax.toString(),
      discount: inv.discount.toString(),
      total: inv.total.toString()
    }));
  }

  async getInvoice(id: string, organizationId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId }
    });

    if (!invoice) {
        throw new NotFoundException(`Invoice ${id} not found`);
    }

    return {
        ...invoice,
        subtotal: invoice.subtotal.toString(),
        tax: invoice.tax.toString(),
        discount: invoice.discount.toString(),
        total: invoice.total.toString()
    };
  }
}
