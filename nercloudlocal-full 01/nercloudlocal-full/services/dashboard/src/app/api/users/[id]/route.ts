import { prisma } from "@neercloud/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, updatedAt: true }
  });
  if (!user) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  return Response.json({ user });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const data: any = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.role === "ADMIN" || body.role === "USER") data.role = body.role;
  if (body.status === "ACTIVE" || body.status === "DISABLED") data.status = body.status;

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, status: true }
    });
    return Response.json({ user });
  } catch {
    return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const { id } = await params;
  if (id === current.id) return Response.json({ error: "Não remova seu próprio usuário" }, { status: 400 });

  try {
    await prisma.user.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
}
