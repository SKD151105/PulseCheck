import { Monitor } from "./monitor.model.js";

export const monitorRepository = {
  countByUserId(userId) {
    return Monitor.countDocuments({ userId });
  },
  create(data) {
    return Monitor.create(data);
  },
  findByUserId(userId) {
    return Monitor.find({ userId }).sort({ createdAt: -1 }).lean();
  },
  findByUserIdAndSearch(userId, search) {
    const query = {
      userId,
      ...(search
        ? {
            url: {
              $regex: search,
              $options: "i",
            },
          }
        : {}),
    };

    return Monitor.find(query).sort({ createdAt: -1 }).lean();
  },
  findById(id) {
    return Monitor.findById(id);
  },
  findByIdAndUserId(id, userId) {
    return Monitor.findOne({ _id: id, userId }).lean();
  },
  findDueMonitors(cutoffByInterval) {
    return Monitor.find({
      $or: cutoffByInterval,
    }).lean();
  },
  updateCheckResult(monitorId, payload) {
    return Monitor.findByIdAndUpdate(monitorId, payload, {
      returnDocument: "after",
      lean: true,
    });
  },
  updateByIdAndUserId(id, userId, payload) {
    return Monitor.findOneAndUpdate({ _id: id, userId }, payload, {
      returnDocument: "after",
      lean: true,
    });
  },
  deleteByIdAndUserId(id, userId) {
    return Monitor.findOneAndDelete({ _id: id, userId }).lean();
  },
};
