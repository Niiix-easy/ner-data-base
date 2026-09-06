import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    }
  });
}
