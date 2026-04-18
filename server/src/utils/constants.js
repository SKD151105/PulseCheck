export const PLANS = {
  FREE: "FREE",
  PRO: "PRO",
};

export const PLAN_LIMITS = {
  FREE: { maxMonitors: 5, minInterval: 5 },
  PRO: { maxMonitors: 50, minInterval: 1 },
};

export const MONITOR_INTERVAL_OPTIONS = [1, 2, 5, 10, 30];

export const MONITOR_STATUS = {
  PENDING: "PENDING",
  UP: "UP",
  DOWN: "DOWN",
};

export const CACHE_KEYS = {
  monitors: (userId) => `monitors:${userId}`,
  rateLimit: (scope, key) => `rate-limit:${scope}:${key}`,
};

export const CACHE_TTL = {
  monitors: 30,
};

export const RATE_LIMITS = {
  auth: { windowSeconds: 60, maxRequests: 10 },
  createMonitor: { windowSeconds: 60, maxRequests: 20 },
};

export const INCIDENT_RULES = {
  failureThreshold: 2,
};
