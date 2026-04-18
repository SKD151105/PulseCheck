import { monitorRepository } from "./monitor.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  CACHE_KEYS,
  CACHE_TTL,
  MONITOR_INTERVAL_OPTIONS,
  PLAN_LIMITS,
} from "../../utils/constants.js";
import { getRedis } from "../../config/redis.js";

const normalizeUrl = (value) => {
  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("invalid_protocol");
    }

    return parsed.toString();
  } catch {
    throw new ApiError(400, "Please enter a valid URL");
  }
};

const serializeMonitor = (monitor) => ({
  id: monitor._id?.toString?.() ?? monitor.id,
  userId: monitor.userId?.toString?.() ?? monitor.userId,
  url: monitor.url,
  interval: monitor.interval,
  status: monitor.status,
  lastCheckedAt: monitor.lastCheckedAt,
  lastResponseTime: monitor.lastResponseTime,
  createdAt: monitor.createdAt,
  updatedAt: monitor.updatedAt,
});

const getPlanLimits = async (userId) => {
  const user = await authRepository.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    plan: user.plan,
    limits: PLAN_LIMITS[user.plan],
  };
};

const clearMonitorCache = async (userId) => {
  await getRedis().del(CACHE_KEYS.monitors(userId));
};

export const monitorService = {
  async createMonitor(userId, payload) {
    const interval = Number(payload.interval);
    const url = normalizeUrl(payload.url?.trim());

    if (!MONITOR_INTERVAL_OPTIONS.includes(interval)) {
      throw new ApiError(400, "Unsupported interval value");
    }

    const { limits } = await getPlanLimits(userId);
    const totalMonitors = await monitorRepository.countByUserId(userId);

    if (totalMonitors >= limits.maxMonitors) {
      throw new ApiError(403, `Plan limit reached. Max monitors: ${limits.maxMonitors}`);
    }

    if (interval < limits.minInterval) {
      throw new ApiError(403, `Your plan supports intervals of ${limits.minInterval} minutes or more`);
    }

    const monitor = await monitorRepository.create({
      userId,
      url,
      interval,
    });

    await clearMonitorCache(userId);

    return serializeMonitor(monitor);
  },

  async getUserMonitors(userId) {
    const redis = getRedis();
    const cacheKey = CACHE_KEYS.monitors(userId);
    const cachedValue = await redis.get(cacheKey);

    if (cachedValue) {
      return JSON.parse(cachedValue);
    }

    const monitors = await monitorRepository.findByUserId(userId);
    const serialized = monitors.map(serializeMonitor);

    await redis.set(cacheKey, JSON.stringify(serialized), "EX", CACHE_TTL.monitors);

    return serialized;
  },

  async deleteMonitor(userId, monitorId) {
    const monitor = await monitorRepository.deleteByIdAndUserId(monitorId, userId);

    if (!monitor) {
      throw new ApiError(404, "Monitor not found");
    }

    await clearMonitorCache(userId);

    return serializeMonitor(monitor);
  },
};
