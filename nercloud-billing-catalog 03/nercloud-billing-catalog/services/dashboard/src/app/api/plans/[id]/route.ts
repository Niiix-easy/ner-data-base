import { db } from "@neercloud/db";
import { NextRequest } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Context) {
  const { id } = await context.params;
  const data = await db.plan.findUnique({
    where: { id },
    include: { product: { select: { id: true, name: true } }, _count: { select: { versions: true } } }
  });
  if (!data) return Response.json({ error: "Registro não encontrado." }, { status: 404 });
  return Response.json({ data });
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const data = await db.plan.update({
      where: { id },
      data: body
    });
    return Response.json({ data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível atualizar o registro." }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    await db.plan.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Não foi possível excluir o registro." }, { status: 400 });
  }
}
