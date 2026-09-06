import { db } from "@neercloud/db";
import { NextRequest } from "next/server";

export async function GET() {
  const data = await db.price.findMany({
    include: { planVersion: { include: { plan: { select: { id: true, name: true } } } }, meter: { select: { id: true, key: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planVersionId, key, name, type, currency, unitAmount, interval, intervalCount, trialDays, meterId, active, metadata } = body;
    const data = await db.price.create({
      data: { planVersionId, key, name, type, currency: String(currency || "BRL").toUpperCase(), unitAmount: Number(unitAmount), interval: interval || null, intervalCount: Number(intervalCount || 1), trialDays: Number(trialDays || 0), meterId: meterId || null, active: active ?? true, metadata: metadata ?? undefined }
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível criar o registro." }, { status: 400 });
  }
}
