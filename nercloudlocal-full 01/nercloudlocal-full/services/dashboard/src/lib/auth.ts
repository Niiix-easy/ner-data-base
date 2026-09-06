import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@neercloud/db";
import { env } from "@neercloud/config";

const COOKIE = "neercloud_session";
const MAX_AGE = 60 * 60 * 24;

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + MAX_AGE * 1000)
    }
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    path: "/",
    maxAge: MAX_AGE
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
  }
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
    return null;
  }

  return session.user;
}
