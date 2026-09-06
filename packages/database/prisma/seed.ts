import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function executeRawSqlFile(filePath: string) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    // Prisma executeRawUnsafe allows multi-statement SQL strings with DO blocks
    console.log(`Executing raw SQL from ${filePath}...`);
    await prisma.$executeRawUnsafe(sql);
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error);
  }
}

async function main() {
  console.log('Seeding Neer-Data-Base Database...');

  // Apply Advanced Security RLS and Triggers NOW THAT TABLES EXIST
  await executeRawSqlFile(path.join(__dirname, '../sql/02-rls-setup.sql'));
  await executeRawSqlFile(path.join(__dirname, '../sql/03-advanced-security.sql'));

  // 0. Create Admin User
  await prisma.user.upsert({
    where: { email: 'neersoftwarebr@gmail.com' },
    update: {},
    create: {
      email: 'neersoftwarebr@gmail.com',
      name: 'Neer Admin',
    },
  });

  // 1. Create Products
  const productsData = [
    { slug: 'database', name: 'Database' },
    { slug: 'storage', name: 'Storage' },
    { slug: 'bandwidth', name: 'Bandwidth' },
    { slug: 'functions', name: 'Functions' },
    { slug: 'redis', name: 'Redis' },
    { slug: 'realtime', name: 'Realtime' },
    { slug: 'compute', name: 'Compute' },
    { slug: 'ai', name: 'AI' }
  ];

  const products = [];
  for (const p of productsData) {
    products.push(
      await prisma.product.upsert({
        where: { slug: p.slug },
        update: {},
        create: p,
      })
    );
  }

  // 2. Create Meters
  const metersData = [
    { productId: products.find(p => p.slug === 'database')!.id, slug: 'database.storage', name: 'Database Storage', unit: 'GB', aggregation: 'MAX' },
    { productId: products.find(p => p.slug === 'database')!.id, slug: 'database.compute', name: 'Database Compute', unit: 'HOURS', aggregation: 'SUM' },
    { productId: products.find(p => p.slug === 'storage')!.id, slug: 'storage.capacity', name: 'Storage Capacity', unit: 'GB', aggregation: 'MAX' },
    { productId: products.find(p => p.slug === 'bandwidth')!.id, slug: 'bandwidth', name: 'Bandwidth', unit: 'GB', aggregation: 'SUM' },
    { productId: products.find(p => p.slug === 'functions')!.id, slug: 'functions.invocations', name: 'Function Invocations', unit: 'COUNT', aggregation: 'SUM' }
  ];

  for (const m of metersData) {
    await prisma.meter.upsert({
      where: { slug: m.slug },
      update: {},
      create: m,
    });
  }

  // 3. Create Plans
  const plansData = [
    { slug: 'free', name: 'Free', price: 0 },
    { slug: 'developer', name: 'Developer', price: 900 },
    { slug: 'starter', name: 'Starter', price: 2900 },
    { slug: 'pro', name: 'Pro', price: 7900 },
    { slug: 'business', name: 'Business', price: 19900 },
    { slug: 'scale', name: 'Scale', price: 59900 }
  ];

  for (const p of plansData) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, name: p.name },
    });

    // Create initial PlanVersion
    const version = await prisma.planVersion.create({
      data: { planId: plan.id, version: 1 }
    });

    // Create Base Price
    await prisma.price.create({
      data: {
        planVersionId: version.id,
        unitAmount: p.price,
        currency: 'USD',
        billingInterval: 'MONTH'
      }
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
