import axios from "axios";
import { monitorRepository } from "../monitors/monitor.repository.js";
import { checkRepository } from "./check.repository.js";
import { getRedis } from "../../config/redis.js";
import { CACHE_KEYS, MONITOR_INTERVAL_OPTIONS, MONITOR_STATUS } from "../../utils/constants.js";
import { logger } from "../../utils/logger.js";

const buildDueFilters = () =>
  MONITOR_INTERVAL_OPTIONS.map((interval) => ({
    interval,
    $or: [
      { lastCheckedAt: null },
      { lastCheckedAt: { $lte: new Date(Date.now() - interval * 60 * 1000) } },
    ],
  })).flatMap((entry) =>
    entry.$or.map((condition) => ({
      interval: entry.interval,
      ...condition,
    }))
  );

const emitMonitorUpdate = (io, payload, statusChanged) => {
  io.to(`user:${payload.userId}`).emit("monitor_checked", payload);

  if (statusChanged) {
    io.to(`user:${payload.userId}`).emit("status_change", payload);
  }
};

const checkMonitorHealth = async (monitor) => {
  const startedAt = Date.now();

  try {
    await axios.get(monitor.url, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    return {
      status: MONITOR_STATUS.UP,
      responseTime: Date.now() - startedAt,
    };
  } catch {
    return {
      status: MONITOR_STATUS.DOWN,
      responseTime: null,
    };
  }
};

export const checkService = {
  async processDueMonitors(io) {
    const dueMonitors = await monitorRepository.findDueMonitors(buildDueFilters());
    logger.debug("Processing due monitors", { total: dueMonitors.length });

    await Promise.all(
      dueMonitors.map(async (monitor) => {
        try {
          const result = await checkMonitorHealth(monitor);
          const checkedAt = new Date();
          const statusChanged =
            monitor.status !== MONITOR_STATUS.PENDING && monitor.status !== result.status;

          await checkRepository.create({
            monitorId: monitor._id,
            status: result.status,
            responseTime: result.responseTime,
            checkedAt,
          });

          const updatedMonitor = await monitorRepository.updateCheckResult(monitor._id, {
            status: result.status,
            lastCheckedAt: checkedAt,
            lastResponseTime: result.responseTime,
          });

          await getRedis().del(CACHE_KEYS.monitors(monitor.userId.toString()));

          emitMonitorUpdate(
            io,
            {
              id: updatedMonitor._id.toString(),
              userId: updatedMonitor.userId.toString(),
              status: updatedMonitor.status,
              lastCheckedAt: updatedMonitor.lastCheckedAt,
              lastResponseTime: updatedMonitor.lastResponseTime,
              url: updatedMonitor.url,
              interval: updatedMonitor.interval,
            },
            statusChanged
          );

          logger.info("Monitor checked", {
            monitorId: updatedMonitor._id.toString(),
            userId: updatedMonitor.userId.toString(),
            status: updatedMonitor.status,
            responseTime: updatedMonitor.lastResponseTime,
            statusChanged,
          });
        } catch (error) {
          logger.error("Monitor check failed", {
            monitorId: monitor._id.toString(),
            url: monitor.url,
            message: error.message,
          });
        }
      })
    );
  },
};
