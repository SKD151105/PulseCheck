import Redis from "ioredis";
import { logger } from "../utils/logger.js";

let redis;

export const connectRedis = () => {
  if (redis) {
    return redis;
  }

  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  redis.on("connect", () => {
    logger.info("Redis connected");
  });

  redis.on("error", (error) => {
    logger.error("Redis error", { message: error.message });
  });

  return redis;
};

export const getRedis = () => {
  if (!redis) {
    throw new Error("Redis is not initialized");
  }

  return redis;
};
