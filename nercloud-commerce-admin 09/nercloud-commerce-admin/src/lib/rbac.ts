import { AdminRole } from "@prisma/client";

const permissions: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ["billing:read","billing:write","usage:read","invoice:read","invoice:write","payment:read","payment:write","plan:read","plan:write","admin:read","admin:write"],
  BILLING_ADMIN: ["billing:read","billing:write","usage:read","invoice:read","invoice:write","payment:read","payment:write","plan:read","plan:write"],
  SUPPORT_ADMIN: ["billing:read","usage:read","invoice:read","payment:read","plan:read"],
  VIEWER: ["billing:read","usage:read","invoice:read","payment:read","plan:read"]
};

export function can(role: AdminRole, permission: string) {
  return permissions[role]?.includes(permission) ?? false;
}
