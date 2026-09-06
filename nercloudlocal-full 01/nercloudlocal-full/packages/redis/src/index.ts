import Redis from "ioredis";
import { env } from "@neercloud/config";

declare global {
  // eslint-disable-next-line no-var
  var __neercloudRedis: Redis | undefined;
}

export const redis =
  globalThis.__neercloudRedis ??
  new Redis(env.redisUrl, {
    password: env.redisPassword || undefined,
    maxRetriesPerRequest: 2,
    lazyConnect: false
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__neercloudRedis = redis;
}
