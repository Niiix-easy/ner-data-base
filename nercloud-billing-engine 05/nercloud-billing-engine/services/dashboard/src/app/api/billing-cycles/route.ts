import { db } from "@neercloud/db";
import { NextRequest } from "next/server";

export async function GET() {
  const data = await db.billingCycle.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await db.billingCycle.create({ data: body });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }
}
