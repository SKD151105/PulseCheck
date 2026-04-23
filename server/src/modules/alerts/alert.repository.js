import { AlertNotification } from "./alert.model.js";

export const alertRepository = {
  create(data) {
    return AlertNotification.create(data);
  },
  findRecentByUserId(userId, limit = 12) {
    return AlertNotification.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  },
};
