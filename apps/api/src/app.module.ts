import { Module } from '@nestjs/common';
import { AdminController } from './modules/admin/admin.controller';
import { ProjectsController } from './modules/projects/projects.controller';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { SystemModule } from './modules/system/system.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    PaymentsModule,
    SubscriptionsModule,
    BillingModule,
    SystemModule,
    InvoicesModule,
    UsersModule
  ],
  controllers: [AdminController, ProjectsController],
  providers: [],
})
export class AppModule {}
