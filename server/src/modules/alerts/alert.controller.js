import { alertService } from "./alert.service.js";

export const alertController = {
  async getSettings(req, res) {
    const settings = await alertService.getAlertSettings(req.user.id);
    res.json({ settings });
  },

  async updateSettings(req, res) {
    const settings = await alertService.updateAlertSettings(req.user.id, req.body);
    res.json({ settings });
  },

  async listHistory(req, res) {
    const notifications = await alertService.getNotificationHistory(req.user.id);
    res.json({ notifications });
  },
};
