import { CheckLog } from "./check.model.js";

export const checkRepository = {
  create(data) {
    return CheckLog.create(data);
  },
  findRecentByMonitorId(monitorId, limit = 30) {
    return CheckLog.find({ monitorId }).sort({ checkedAt: -1 }).limit(limit).lean();
  },
  async getMonitorSummary(monitorId, sinceDate) {
    const [summary] = await CheckLog.aggregate([
      {
        $match: {
          monitorId,
          checkedAt: { $gte: sinceDate },
        },
      },
      {
        $group: {
          _id: null,
          totalChecks: { $sum: 1 },
          upChecks: {
            $sum: { $cond: [{ $eq: ["$status", "UP"] }, 1, 0] },
          },
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    return summary ?? null;
  },
  getResponseTrend(monitorId, sinceDate, limit = 20) {
    return CheckLog.find({
      monitorId,
      checkedAt: { $gte: sinceDate },
      responseTime: { $ne: null },
    })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .lean();
  },
  async getDailyUptimeTrend(monitorId, sinceDate) {
    return CheckLog.aggregate([
      {
        $match: {
          monitorId,
          checkedAt: { $gte: sinceDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$checkedAt" },
            month: { $month: "$checkedAt" },
            day: { $dayOfMonth: "$checkedAt" },
          },
          totalChecks: { $sum: 1 },
          upChecks: {
            $sum: { $cond: [{ $eq: ["$status", "UP"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);
  },
};
