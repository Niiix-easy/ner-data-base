import { db } from "@neercloud/db";
import { NextRequest } from "next/server";

export async function GET() {
  const data = await db.plan.findMany({
    include: { product: { select: { id: true, name: true } }, _count: { select: { versions: true } } },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, key, name, description, status, metadata } = body;
    const data = await db.plan.create({
      data: { productId, key, name, description: description || null, status: status || "ACTIVE", metadata: metadata ?? undefined }
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível criar o registro." }, { status: 400 });
  }
}
