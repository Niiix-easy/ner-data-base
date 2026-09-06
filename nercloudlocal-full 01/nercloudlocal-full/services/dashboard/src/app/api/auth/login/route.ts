import { env } from "@neercloud/config";
import { prisma } from "@neercloud/db";
import { logger } from "@neercloud/logger";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!env.adminPassword) {
      logger.error("STUDIO_ADMIN_PASSWORD não configurado");
      return Response.json({ error: "Configuração do servidor ausente" }, { status: 500 });
    }

    if (password !== env.adminPassword) {
      logger.warn("Tentativa de login inválida");
      return Response.json({ error: "Senha inválida" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { email: "admin@neercloud.local" } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "admin@neercloud.local",
          name: "Administrador",
          role: "ADMIN"
        }
      });
    }

    await createSession(user.id);
    logger.info("Login realizado", { userId: user.id });

    return Response.json({ success: true });
  } catch (e) {
    logger.error("Erro no login", { error: String(e) });
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
