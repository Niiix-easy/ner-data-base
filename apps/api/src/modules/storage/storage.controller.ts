import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsageLimitGuard } from '../system/usage.guard';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/storage')
export class StorageController {

  @UseGuards(UsageLimitGuard)
  @Post('upload')
  async requestUploadUrl(@Body() body: any, @Request() req: any) {
    const { organizationId, filename, size } = body;

    // In a real implementation this would contact the 'storage' service
    // (MinIO/S3 control plane) to generate a presigned PUT URL.
    const mockPresignedUrl = `http://localhost:9000/bucket/${organizationId}/${filename}?X-Amz-Signature=dummy`;

    // Immediately log usage (in a real app, this should be done asynchronously
    // via a webhook from MinIO/S3 when the upload actually completes,
    // but we do it here to demonstrate the UsageLimitGuard blocking subsequent calls).
    await prisma.usageAggregate.create({
        data: {
            organizationId,
            meterId: 'meter_storage',
            periodStart: new Date(),
            periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            quantity: BigInt(size || 0)
        }
    });

    return {
        success: true,
        uploadUrl: mockPresignedUrl
    };
  }
}
