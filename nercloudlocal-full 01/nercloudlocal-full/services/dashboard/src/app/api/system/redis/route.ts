import { redis } from "@neercloud/redis";

export async function GET() {
  const started = Date.now();
  try {
    const result = await redis.ping();
    return Response.json({
      status: result === "PONG" ? "up" : "degraded",
      latencyMs: Date.now() - started,
      redis: result
    });
  } catch (e) {
    return Response.json({ status: "down", error: String(e) }, { status: 503 });
  }
}
