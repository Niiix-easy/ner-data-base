import { Controller, Post, Get, Param, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/coupons')
export class CouponsController {

  @Post()
  async createCoupon(@Body() body: any) {
    const { code, type, value, maxRedemptions, expiresAt } = body;

    if (!code || !type || !value) {
        throw new BadRequestException('Code, type, and value are required');
    }

    const coupon = await prisma.coupon.create({
        data: {
            code,
            type, // 'FIXED' or 'PERCENTAGE'
            value: BigInt(value),
            maxRedemptions,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        }
    });

    return { success: true, coupon: { ...coupon, value: coupon.value.toString() } };
  }

  @Get(':code/validate')
  async validateCoupon(@Param('code') code: string) {
      const coupon = await prisma.coupon.findUnique({ where: { code }});

      if (!coupon) {
          throw new NotFoundException('Coupon not found');
      }

      if (!coupon.active) {
          throw new BadRequestException('Coupon is inactive');
      }

      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
          throw new BadRequestException('Coupon expired');
      }

      if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) {
          throw new BadRequestException('Coupon redemption limit reached');
      }

      return { success: true, coupon: { ...coupon, value: coupon.value.toString() } };
  }
}
