import mongoose from "mongoose";
import { CheckLog } from "../checks/check.model.js";
import { Monitor } from "../monitors/monitor.model.js";
import { MONITOR_STATUS } from "../../utils/constants.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

export const analyticsRepository = {
  async getOverview(userId, { since7d, startOfDay }) {
    const monitorUserId = toObjectId(userId);

    const [summary] = await CheckLog.aggregate([
      {
        $lookup: {
          from: "monitors",
          localField: "monitorId",
          foreignField: "_id",
          as: "monitor",
        },
      },
      { $unwind: "$monitor" },
      {
        $match: {
          "monitor.userId": monitorUserId,
          checkedAt: { $gte: since7d },
        },
      },
      {
        $group: {
          _id: null,
          totalChecks7d: { $sum: 1 },
          upChecks7d: {
            $sum: { $cond: [{ $eq: ["$status", MONITOR_STATUS.UP] }, 1, 0] },
          },
          avgResponseTime7d: { $avg: "$responseTime" },
        },
      },
    ]);

    const [checksTodayResult] = await CheckLog.aggregate([
      {
        $lookup: {
          from: "monitors",
          localField: "monitorId",
          foreignField: "_id",
          as: "monitor",
        },
      },
      { $unwind: "$monitor" },
      {
        $match: {
          "monitor.userId": monitorUserId,
          checkedAt: { $gte: startOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalChecksToday: { $sum: 1 },
        },
      },
    ]);

    const [totalMonitors, activeIncidents, pendingMonitors] = await Promise.all([
      Monitor.countDocuments({ userId }),
      Monitor.countDocuments({ userId, status: MONITOR_STATUS.DOWN }),
      Monitor.countDocuments({ userId, status: MONITOR_STATUS.PENDING }),
    ]);

    return {
      totalMonitors,
      activeIncidents,
      pendingMonitors,
      totalChecksToday: checksTodayResult?.totalChecksToday ?? 0,
      totalChecks7d: summary?.totalChecks7d ?? 0,
      upChecks7d: summary?.upChecks7d ?? 0,
      avgResponseTime7d: summary?.avgResponseTime7d ?? null,
    };
  },

  getMonitorPerformance(userId, since7d) {
    return Monitor.aggregate([
      { $match: { userId: toObjectId(userId) } },
      {
        $lookup: {
          from: "checklogs",
          let: { monitorId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$monitorId", "$$monitorId"],
                },
                checkedAt: { $gte: since7d },
              },
            },
            {
              $group: {
                _id: null,
                totalChecks: { $sum: 1 },
                upChecks: {
                  $sum: { $cond: [{ $eq: ["$status", MONITOR_STATUS.UP] }, 1, 0] },
                },
                downChecks: {
                  $sum: { $cond: [{ $eq: ["$status", MONITOR_STATUS.DOWN] }, 1, 0] },
                },
                avgResponseTime: { $avg: "$responseTime" },
                lastIncidentAt: {
                  $max: {
                    $cond: [{ $eq: ["$status", MONITOR_STATUS.DOWN] }, "$checkedAt", null],
                  },
                },
              },
            },
          ],
          as: "analytics",
        },
      },
      {
        $addFields: {
          analytics: {
            $ifNull: [
              { $arrayElemAt: ["$analytics", 0] },
              {
                totalChecks: 0,
                upChecks: 0,
                downChecks: 0,
                avgResponseTime: null,
                lastIncidentAt: null,
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          url: 1,
          status: 1,
          interval: 1,
          lastCheckedAt: 1,
          totalChecks: "$analytics.totalChecks",
          upChecks: "$analytics.upChecks",
          downChecks: "$analytics.downChecks",
          avgResponseTime: "$analytics.avgResponseTime",
          lastIncidentAt: "$analytics.lastIncidentAt",
        },
      },
      { $sort: { totalChecks: -1, createdAt: -1 } },
    ]);
  },

  getRecentIncidents(userId, since7d) {
    return CheckLog.aggregate([
      {
        $lookup: {
          from: "monitors",
          localField: "monitorId",
          foreignField: "_id",
          as: "monitor",
        },
      },
      { $unwind: "$monitor" },
      {
        $match: {
          "monitor.userId": toObjectId(userId),
          status: MONITOR_STATUS.DOWN,
          checkedAt: { $gte: since7d },
        },
      },
      {
        $project: {
          _id: 0,
          monitorId: "$monitor._id",
          url: "$monitor.url",
          checkedAt: 1,
          responseTime: 1,
        },
      },
      { $sort: { checkedAt: -1 } },
      { $limit: 5 },
    ]);
  },
};
