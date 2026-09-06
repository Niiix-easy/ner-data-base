import { Controller, Get, Param, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async getInvoices(@Query('organizationId') organizationId: string) {
    return this.invoicesService.getInvoices(organizationId);
  }

  @Get(':id')
  async getInvoice(
      @Param('id') id: string,
      @Query('organizationId') organizationId: string
  ) {
    return this.invoicesService.getInvoice(id, organizationId);
  }
}
