import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  redisPassword: process.env.REDIS_PASSWORD ?? "",
  adminPassword: required("STUDIO_ADMIN_PASSWORD"),
  sessionSecret: required("STUDIO_SESSION_SECRET"),
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "NeerCloud Local"
};
