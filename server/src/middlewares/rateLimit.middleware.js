import { getRedis } from "../config/redis.js";
import { ApiError } from "../utils/ApiError.js";
import { CACHE_KEYS } from "../utils/constants.js";

export const createRateLimitMiddleware = (scope, config, keyResolver) => async (req, _res, next) => {
  try {
    const redis = getRedis();
    const key = CACHE_KEYS.rateLimit(scope, keyResolver(req));
    const total = await redis.incr(key);

    if (total === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    if (total > config.maxRequests) {
      return next(new ApiError(429, "Too many requests"));
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
