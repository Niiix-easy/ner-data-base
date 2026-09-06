import { prisma } from "@neercloud/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const projects = current.role === "ADMIN"
    ? await prisma.project.findMany({ include: { members: true }, orderBy: { createdAt: "desc" } })
    : await prisma.project.findMany({
        where: { members: { some: { userId: current.id } } },
        include: { members: true },
        orderBy: { createdAt: "desc" }
      });

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string"
    ? body.slug.trim().toLowerCase()
    : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const description = typeof body.description === "string" ? body.description.trim() : undefined;

  if (!name || !slug) return Response.json({ error: "name é obrigatório" }, { status: 400 });

  try {
    const project = await prisma.project.create({
      data: {
        name,
        slug,
        description,
        members: { create: { userId: current.id } }
      },
      include: { members: true }
    });
    return Response.json({ project }, { status: 201 });
  } catch {
    return Response.json({ error: "Slug já existe" }, { status: 409 });
  }
}
