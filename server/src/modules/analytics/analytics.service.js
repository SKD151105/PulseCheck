import { analyticsRepository } from "./analytics.repository.js";

const toPercent = (value, total) => {
  if (!total) {
    return null;
  }

  return Number(((value / total) * 100).toFixed(1));
};

const toRoundedMs = (value) => (typeof value === "number" ? Math.round(value) : null);

const serializeMonitorMetric = (monitor) => ({
  monitorId: monitor._id.toString(),
  url: monitor.url,
  status: monitor.status,
  interval: monitor.interval,
  lastCheckedAt: monitor.lastCheckedAt,
  lastIncidentAt: monitor.lastIncidentAt,
  totalChecks: monitor.totalChecks,
  upChecks: monitor.upChecks,
  downChecks: monitor.downChecks,
  uptimePercentage: toPercent(monitor.upChecks, monitor.totalChecks),
  avgResponseTime: toRoundedMs(monitor.avgResponseTime),
});

export const analyticsService = {
  async getDashboardAnalytics(userId) {
    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [overview, monitorPerformance, recentIncidents] = await Promise.all([
      analyticsRepository.getOverview(userId, { since7d, startOfDay }),
      analyticsRepository.getMonitorPerformance(userId, since7d),
      analyticsRepository.getRecentIncidents(userId, since7d),
    ]);

    const performance = monitorPerformance.map(serializeMonitorMetric);
    const stableMonitors = performance.filter((item) => item.totalChecks > 0);

    const mostReliable = [...stableMonitors]
      .sort((left, right) => {
        if ((right.uptimePercentage ?? -1) !== (left.uptimePercentage ?? -1)) {
          return (right.uptimePercentage ?? -1) - (left.uptimePercentage ?? -1);
        }

        return (left.avgResponseTime ?? Number.MAX_SAFE_INTEGER) - (right.avgResponseTime ?? Number.MAX_SAFE_INTEGER);
      })
      .slice(0, 3);

    const unstableMonitors = [...stableMonitors]
      .filter((item) => item.downChecks > 0)
      .sort((left, right) => {
        if (right.downChecks !== left.downChecks) {
          return right.downChecks - left.downChecks;
        }

        return (left.uptimePercentage ?? 100) - (right.uptimePercentage ?? 100);
      })
      .slice(0, 3);

    return {
      overview: {
        totalMonitors: overview.totalMonitors,
        activeIncidents: overview.activeIncidents,
        pendingMonitors: overview.pendingMonitors,
        checksToday: overview.totalChecksToday,
        uptimePercentage7d: toPercent(overview.upChecks7d, overview.totalChecks7d),
        avgResponseTime7d: toRoundedMs(overview.avgResponseTime7d),
      },
      highlights: {
        bestMonitor: mostReliable[0] ?? null,
        unstableMonitor: unstableMonitors[0] ?? null,
      },
      recentIncidents: recentIncidents.map((incident) => ({
        monitorId: incident.monitorId.toString(),
        url: incident.url,
        checkedAt: incident.checkedAt,
        responseTime: toRoundedMs(incident.responseTime),
      })),
      monitorPerformance: performance,
      topReliable: mostReliable,
      unstableMonitors,
    };
  },
};
