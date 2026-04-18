import { analyticsService } from "./analytics.service.js";

export const analyticsController = {
  async dashboard(req, res) {
    const analytics = await analyticsService.getDashboardAnalytics(req.user.id);
    res.json({ analytics });
  },
};
