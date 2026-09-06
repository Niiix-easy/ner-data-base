import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const API_KEY_PEPPER = process.env.API_KEY_PEPPER!;

if (!JWT_SECRET || !API_KEY_PEPPER) throw new Error("JWT_SECRET and API_KEY_PEPPER are required");

export function signAccessToken(payload: { userId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateApiKey() {
  const secret = crypto.randomBytes(32).toString("base64url");
  const prefix = `sk_${crypto.randomBytes(6).toString("hex")}`;
  const raw = `${prefix}.${secret}`;
  const hash = crypto.createHmac("sha256", API_KEY_PEPPER).update(raw).digest("hex");
  return { raw, prefix, hash };
}

export function hashApiKey(raw: string) {
  return crypto.createHmac("sha256", API_KEY_PEPPER).update(raw).digest("hex");
}
