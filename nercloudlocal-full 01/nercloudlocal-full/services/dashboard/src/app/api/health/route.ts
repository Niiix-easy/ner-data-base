import { prisma } from "@neercloud/db";
import { redis } from "@neercloud/redis";
import { logger } from "@neercloud/logger";

export async function GET() {
  let postgres = "down";
  let redisStatus = "down";

  try {
    await prisma.$queryRaw`SELECT 1`;
    postgres = "up";
  } catch (e) {
    logger.error("PostgreSQL health check failed", { error: String(e) });
  }

  try {
    await redis.ping();
    redisStatus = "up";
  } catch (e) {
    logger.error("Redis health check failed", { error: String(e) });
  }

  const healthy = postgres === "up" && redisStatus === "up";

  return Response.json({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: { postgres, redis: redisStatus }
  }, { status: healthy ? 200 : 503 });
}
