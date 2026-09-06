import { Module } from '@nestjs/common';
import { AdminController } from './modules/admin/admin.controller';
import { ProjectsController } from './modules/projects/projects.controller';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { SystemModule } from './modules/system/system.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    PaymentsModule,
    SubscriptionsModule,
    BillingModule,
    SystemModule,
    InvoicesModule,
    UsersModule,
    AuthModule,
    CouponsModule,
    StorageModule
  ],
  controllers: [AdminController, ProjectsController],
  providers: [],
})
export class AppModule {}
