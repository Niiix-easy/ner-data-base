import { db } from "@neercloud/db";
import { NextRequest } from "next/server";

export async function GET() {
  const data = await db.meter.findMany({
    include: { _count: { select: { prices: true, entitlements: true } } },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, name, description, unit, aggregation, active, metadata } = body;
    const data = await db.meter.create({
      data: { key, name, description: description || null, unit, aggregation: aggregation || "SUM", active: active ?? true, metadata: metadata ?? undefined }
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível criar o registro." }, { status: 400 });
  }
}
