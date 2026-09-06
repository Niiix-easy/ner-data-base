import { db } from "@neercloud/db";
import { NextRequest } from "next/server";

export async function GET() {
  const data = await db.planVersion.findMany({
    include: { plan: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, version, status, effectiveAt, retiredAt, description, metadata } = body;
    const data = await db.planVersion.create({
      data: { planId, version: Number(version), status: status || "DRAFT", effectiveAt: effectiveAt ? new Date(effectiveAt) : null, description: description || null, metadata: metadata ?? undefined }
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível criar o registro." }, { status: 400 });
  }
}
