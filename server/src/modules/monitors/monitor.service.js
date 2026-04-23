import dns from "dns/promises";
import net from "net";
import { monitorRepository } from "./monitor.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { checkRepository } from "../checks/check.repository.js";
import { incidentRepository } from "../incidents/incident.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  CACHE_KEYS,
  CACHE_TTL,
  MONITOR_INTERVAL_OPTIONS,
  PLAN_LIMITS,
} from "../../utils/constants.js";
import { getRedis } from "../../config/redis.js";
import { logger } from "../../utils/logger.js";

const normalizeIpAddress = (address) =>
  address.toLowerCase().startsWith("::ffff:") ? address.slice(7) : address;

const isPrivateIpv4 = (address) => {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second, third] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    address === "255.255.255.255"
  );
};

const isPrivateIpv6 = (address) => {
  const normalized = address.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

const isPrivateAddress = (address) => {
  const normalized = normalizeIpAddress(address);
  const version = net.isIP(normalized);

  if (version === 4) {
    return isPrivateIpv4(normalized);
  }

  if (version === 6) {
    return isPrivateIpv6(normalized);
  }

  return true;
};

const assertPublicTarget = async (hostname) => {
  const normalizedHostname = hostname.toLowerCase();

  if (normalizedHostname === "localhost" || normalizedHostname.endsWith(".localhost")) {
    throw new ApiError(400, "Private or localhost URLs cannot be monitored");
  }

  if (net.isIP(normalizedHostname)) {
    if (isPrivateAddress(normalizedHostname)) {
      throw new ApiError(400, "Private or localhost URLs cannot be monitored");
    }

    return;
  }

  let addresses;

  try {
    addresses = await dns.lookup(normalizedHostname, { all: true });
  } catch {
    throw new ApiError(400, "Monitor URL hostname could not be resolved");
  }

  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new ApiError(400, "Private or localhost URLs cannot be monitored");
  }
};

const normalizeUrl = async (value) => {
  let parsed;

  try {
    parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("invalid_protocol");
    }
  } catch {
    throw new ApiError(400, "Please enter a valid URL");
  }

  await assertPublicTarget(parsed.hostname);

  return parsed.toString();
};

const serializeMonitor = (monitor) => ({
  id: monitor._id?.toString?.() ?? monitor.id,
  userId: monitor.userId?.toString?.() ?? monitor.userId,
  url: monitor.url,
  interval: monitor.interval,
  status: monitor.status,
  lastCheckedAt: monitor.lastCheckedAt,
  lastResponseTime: monitor.lastResponseTime,
  consecutiveFailures: monitor.consecutiveFailures ?? 0,
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
    const url = await normalizeUrl(payload.url?.trim());

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
    logger.info("Monitor created", { userId, monitorId: monitor.id, url, interval });

    return serializeMonitor(monitor);
  },

  async getUserMonitors(userId, search = "") {
    const redis = getRedis();
    const normalizedSearch = search.trim();
    const cacheKey = normalizedSearch ? null : CACHE_KEYS.monitors(userId);
    const cachedValue = cacheKey ? await redis.get(cacheKey) : null;

    if (cachedValue) {
      return JSON.parse(cachedValue);
    }

    const monitors = normalizedSearch
      ? await monitorRepository.findByUserIdAndSearch(userId, normalizedSearch)
      : await monitorRepository.findByUserId(userId);
    const serialized = monitors.map(serializeMonitor);

    if (cacheKey) {
      await redis.set(cacheKey, JSON.stringify(serialized), "EX", CACHE_TTL.monitors);
    }

    return serialized;
  },

  async updateMonitor(userId, monitorId, payload) {
    const existingMonitor = await monitorRepository.findByIdAndUserId(monitorId, userId);

    if (!existingMonitor) {
      throw new ApiError(404, "Monitor not found");
    }

    const nextInterval = payload.interval !== undefined ? Number(payload.interval) : existingMonitor.interval;
    const nextUrl = payload.url !== undefined ? await normalizeUrl(payload.url.trim()) : existingMonitor.url;

    if (!MONITOR_INTERVAL_OPTIONS.includes(nextInterval)) {
      throw new ApiError(400, "Unsupported interval value");
    }

    const { limits } = await getPlanLimits(userId);

    if (nextInterval < limits.minInterval) {
      throw new ApiError(403, `Your plan supports intervals of ${limits.minInterval} minutes or more`);
    }

    const monitor = await monitorRepository.updateByIdAndUserId(monitorId, userId, {
      url: nextUrl,
      interval: nextInterval,
    });

    await clearMonitorCache(userId);
    logger.info("Monitor updated", { userId, monitorId, url: nextUrl, interval: nextInterval });

    return serializeMonitor(monitor);
  },

  async getMonitorDetails(userId, monitorId) {
    const monitor = await monitorRepository.findByIdAndUserId(monitorId, userId);

    if (!monitor) {
      throw new ApiError(404, "Monitor not found");
    }

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [summary24h, summary7d, recentChecks, incidents, responseTrend, uptimeTrend] = await Promise.all([
      checkRepository.getMonitorSummary(monitor._id, since24h),
      checkRepository.getMonitorSummary(monitor._id, since7d),
      checkRepository.findRecentByMonitorId(monitor._id, 10),
      incidentRepository.findRecentByMonitorId(monitor._id, 12),
      checkRepository.getResponseTrend(monitor._id, since24h, 20),
      checkRepository.getDailyUptimeTrend(monitor._id, since7d),
    ]);

    const toPercent = (summary) =>
      summary?.totalChecks ? Number(((summary.upChecks / summary.totalChecks) * 100).toFixed(1)) : null;

    const formatIncident = (incident) => ({
      id: incident._id.toString(),
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      durationMs: incident.durationMs ?? null,
      isOpen: !incident.resolvedAt,
    });

    return {
      monitor: serializeMonitor(monitor),
      summary: {
        uptime24h: toPercent(summary24h),
        uptime7d: toPercent(summary7d),
        avgResponse24h: summary24h?.avgResponseTime ? Math.round(summary24h.avgResponseTime) : null,
        avgResponse7d: summary7d?.avgResponseTime ? Math.round(summary7d.avgResponseTime) : null,
        checks24h: summary24h?.totalChecks ?? 0,
        checks7d: summary7d?.totalChecks ?? 0,
        incidentCount: incidents.length,
      },
      trends: {
        response24h: responseTrend
          .slice()
          .reverse()
          .map((item) => ({
            checkedAt: item.checkedAt,
            responseTime: item.responseTime,
          })),
        uptime7d: uptimeTrend.map((item) => ({
          label: `${item._id.day}/${item._id.month}`,
          uptimePercentage: item.totalChecks ? Number(((item.upChecks / item.totalChecks) * 100).toFixed(1)) : null,
          totalChecks: item.totalChecks,
          failures: item.totalChecks - item.upChecks,
        })),
      },
      recentChecks: recentChecks.map((item) => ({
        id: item._id.toString(),
        status: item.status,
        responseTime: item.responseTime,
        checkedAt: item.checkedAt,
      })),
      incidents: incidents.map(formatIncident),
    };
  },

  async deleteMonitor(userId, monitorId) {
    const monitor = await monitorRepository.deleteByIdAndUserId(monitorId, userId);

    if (!monitor) {
      logger.warn("Monitor delete failed: not found", { userId, monitorId });
      throw new ApiError(404, "Monitor not found");
    }

    await clearMonitorCache(userId);
    logger.info("Monitor deleted", { userId, monitorId: monitor._id?.toString?.() ?? monitor.id });

    return serializeMonitor(monitor);
  },
};
