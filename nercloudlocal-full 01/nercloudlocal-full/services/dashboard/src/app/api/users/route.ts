import { prisma } from "@neercloud/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (current.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  });
  return Response.json({ users });
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current || current.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!email || !name) return Response.json({ error: "email e name são obrigatórios" }, { status: 400 });

  try {
    const user = await prisma.user.create({
      data: { email, name },
      select: { id: true, email: true, name: true, role: true, status: true }
    });
    return Response.json({ user }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível criar o usuário" }, { status: 409 });
  }
}
