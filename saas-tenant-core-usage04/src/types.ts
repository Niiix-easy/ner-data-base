import { Request } from "express";

export type AuthUser = {
  id: string;
  email: string;
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
};

export interface AuthRequest extends Request {
  auth?: AuthUser;
}
