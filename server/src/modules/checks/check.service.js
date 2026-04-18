import axios from "axios";
import { monitorRepository } from "../monitors/monitor.repository.js";
import { checkRepository } from "./check.repository.js";
import { incidentRepository } from "../incidents/incident.repository.js";
import { alertService } from "../alerts/alert.service.js";
import { getRedis } from "../../config/redis.js";
import { CACHE_KEYS, INCIDENT_RULES, MONITOR_INTERVAL_OPTIONS, MONITOR_STATUS } from "../../utils/constants.js";
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
          const nextConsecutiveFailures = result.status === MONITOR_STATUS.DOWN ? (monitor.consecutiveFailures ?? 0) + 1 : 0;
          const failureStreakStartedAt =
            result.status === MONITOR_STATUS.DOWN
              ? monitor.failureStreakStartedAt ?? checkedAt
              : null;

          let nextStatus = monitor.status;
          let statusChanged = false;
          let incidentEvent = null;

          if (result.status === MONITOR_STATUS.DOWN) {
            if (monitor.status !== MONITOR_STATUS.DOWN && nextConsecutiveFailures >= INCIDENT_RULES.failureThreshold) {
              nextStatus = MONITOR_STATUS.DOWN;
              statusChanged = true;

              const openIncident = await incidentRepository.findOpenByMonitorId(monitor._id);

              if (!openIncident) {
                await incidentRepository.create({
                  userId: monitor.userId,
                  monitorId: monitor._id,
                  startedAt: failureStreakStartedAt,
                });
              }

              incidentEvent = "opened";
            }
          } else {
            if (monitor.status === MONITOR_STATUS.DOWN) {
              nextStatus = MONITOR_STATUS.UP;
              statusChanged = true;
              const openIncident = await incidentRepository.findOpenByMonitorId(monitor._id);

              if (openIncident) {
                await incidentRepository.resolveById(openIncident._id, {
                  resolvedAt: checkedAt,
                  durationMs: checkedAt.getTime() - openIncident.startedAt.getTime(),
                });
              }

              incidentEvent = "resolved";
            } else {
              nextStatus = MONITOR_STATUS.UP;
              statusChanged = monitor.status === MONITOR_STATUS.PENDING;
            }
          }

          await checkRepository.create({
            monitorId: monitor._id,
            status: result.status,
            responseTime: result.responseTime,
            checkedAt,
          });

          const updatedMonitor = await monitorRepository.updateCheckResult(monitor._id, {
            status: nextStatus,
            lastCheckedAt: checkedAt,
            lastResponseTime: result.responseTime,
            consecutiveFailures: nextConsecutiveFailures,
            failureStreakStartedAt,
          });

          await getRedis().del(CACHE_KEYS.monitors(monitor.userId.toString()));
          const shouldBroadcastStatusChange =
            statusChanged && monitor.status !== MONITOR_STATUS.PENDING;

          emitMonitorUpdate(
            io,
            {
              id: updatedMonitor._id.toString(),
              userId: updatedMonitor.userId.toString(),
              status: updatedMonitor.status,
              checkStatus: result.status,
              lastCheckedAt: updatedMonitor.lastCheckedAt,
              lastResponseTime: updatedMonitor.lastResponseTime,
              url: updatedMonitor.url,
              interval: updatedMonitor.interval,
              consecutiveFailures: updatedMonitor.consecutiveFailures,
              incidentEvent,
            },
            shouldBroadcastStatusChange
          );

          if (shouldBroadcastStatusChange) {
            await alertService.sendStatusChangeAlerts({
              userId: updatedMonitor.userId.toString(),
              url: updatedMonitor.url,
              status: updatedMonitor.status,
              checkedAt,
              responseTime: updatedMonitor.lastResponseTime,
              incidentEvent,
            });
          }

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
