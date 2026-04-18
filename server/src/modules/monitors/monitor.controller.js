import { monitorService } from "./monitor.service.js";

export const monitorController = {
  async create(req, res) {
    const monitor = await monitorService.createMonitor(req.user.id, req.body);
    res.status(201).json({ monitor });
  },

  async list(req, res) {
    const monitors = await monitorService.getUserMonitors(req.user.id);
    res.json({ monitors });
  },

  async remove(req, res) {
    const monitor = await monitorService.deleteMonitor(req.user.id, req.params.monitorId);
    res.json({ monitor });
  },
};
