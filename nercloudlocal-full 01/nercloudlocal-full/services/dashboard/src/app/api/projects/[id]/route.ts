import { prisma } from "@neercloud/db";
import { getCurrentUser } from "@/lib/auth";

async function access(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "ADMIN") return user;

  const member = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.id, projectId: id } }
  });
  return member ? user : null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await access(id);
  if (!user) return Response.json({ error: "Acesso negado" }, { status: 403 });

  const project = await prisma.project.findUnique({
    where: { id },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } }
  });
  if (!project) return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
  return Response.json({ project });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await access(id);
  if (!user || user.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const data: any = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.slug === "string") data.slug = body.slug.trim().toLowerCase();
  if (typeof body.description === "string") data.description = body.description.trim();

  try {
    const project = await prisma.project.update({ where: { id }, data });
    return Response.json({ project });
  } catch {
    return Response.json({ error: "Projeto não encontrado ou slug em uso" }, { status: 409 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await access(id);
  if (!user || user.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  try {
    await prisma.project.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
  }
}
