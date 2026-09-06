import { NextFunction, Response } from "express";
import { prisma } from "../db";
import { AuthRequest } from "../types";
import { hashApiKey, verifyAccessToken } from "../security";

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.header("authorization");
    const apiKey = req.header("x-api-key");

    if (apiKey) {
      const hash = hashApiKey(apiKey);
      const key = await prisma.apiKey.findFirst({
        where: { secretHash: hash, status: "ACTIVE" },
        include: {
          user: true,
          organization: true
        }
      });
      if (!key || (key.expiresAt && key.expiresAt < new Date())) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      const membership = await prisma.membership.findFirst({
        where: { userId: key.userId, organizationId: key.organizationId, status: "ACTIVE" },
        include: { role: { include: { permissions: { include: { permission: true } } } } }
      });
      if (!membership) return res.status(403).json({ error: "No active membership" });

      await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
      req.auth = {
        id: key.userId,
        email: key.user.email,
        organizationId: key.organizationId,
        membershipId: membership.id,
        roleId: membership.roleId,
        roleName: membership.role.name,
        permissions: membership.role.permissions.map(x => x.permission.key)
      };
      return next();
    }

    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required" });
    const token = auth.slice(7);
    const decoded = verifyAccessToken(token);
    const membership = await prisma.membership.findFirst({
      where: { userId: decoded.userId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
        organization: true,
        role: { include: { permissions: { include: { permission: true } } } }
      }
    });
    if (!membership) return res.status(403).json({ error: "No active organization membership" });

    req.auth = {
      id: membership.userId,
      email: membership.user.email,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      roleId: membership.roleId,
      roleName: membership.role.name,
      permissions: membership.role.permissions.map(x => x.permission.key)
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid authentication" });
  }
}

export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "Authentication required" });
    if (!req.auth.permissions.includes(permission)) {
      return res.status(403).json({ error: "Permission denied", permission });
    }
    next();
  };
}

export function tenantId(req: AuthRequest) {
  if (!req.auth?.organizationId) throw new Error("Tenant context missing");
  return req.auth.organizationId;
}
