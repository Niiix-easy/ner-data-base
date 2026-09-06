import { prisma } from "@neercloud/db";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "up",
      latencyMs: Date.now() - started,
      database: "postgresql"
    });
  } catch (e) {
    return Response.json({ status: "down", error: String(e) }, { status: 503 });
  }
}
