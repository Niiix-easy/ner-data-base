import { Controller, Post, Body, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

@Controller('api/auth')
export class AuthController {

  @Post('register')
  async register(@Body() body: any) {
    const { email, password, name, document } = body;

    if (!email || !password || !document) {
      throw new BadRequestException('Email, password, and CPF/CNPJ document are required');
    }

    // Check if user already exists by email OR document (Anti-fraud constraint)
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email },
                { document }
            ]
        }
    });

    if (existingUser) {
        throw new BadRequestException('User with this email or CPF/CNPJ already exists');
    }

    // Hash password (basic hash for demo, should use bcrypt in prod)
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
            document
        }
    });

    // Create default organization for new user
    const org = await prisma.organization.create({
        data: {
            name: `${user.name || 'User'}'s Organization`,
            slug: `org_${user.id}`,
            Members: {
                create: {
                    userId: user.id,
                    role: 'OWNER'
                }
            }
        }
    });

    return { success: true, user: { id: user.id, email: user.email }, organizationId: org.id };
  }

  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;

    if (!email || !password) {
        throw new BadRequestException('Email and password required');
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const user = await prisma.user.findFirst({
        where: { email, password: hashedPassword }
    });

    if (!user) {
        throw new UnauthorizedException('Invalid credentials');
    }

    // Usually you'd return a JWT here
    return {
        success: true,
        token: 'fake-jwt-token-123',
        user: { id: user.id, email: user.email }
    };
  }
}
