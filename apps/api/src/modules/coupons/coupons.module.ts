import { Module } from '@nestjs/common';
import { CouponsController } from './coupons.controller';

@Module({
  controllers: [CouponsController],
  providers: [],
})
export class CouponsModule {}
