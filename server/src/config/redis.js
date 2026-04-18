import Redis from "ioredis";

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
    console.log("Redis connected");
  });

  redis.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  return redis;
};

export const getRedis = () => {
  if (!redis) {
    throw new Error("Redis is not initialized");
  }

  return redis;
};
