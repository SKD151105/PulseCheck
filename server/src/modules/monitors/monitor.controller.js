import { monitorService } from "./monitor.service.js";

export const monitorController = {
  async create(req, res) {
    const monitor = await monitorService.createMonitor(req.user.id, req.body);
    res.status(201).json({ monitor });
  },

  async list(req, res) {
    const monitors = await monitorService.getUserMonitors(req.user.id, req.query.search || "");
    res.json({ monitors });
  },

  async details(req, res) {
    const details = await monitorService.getMonitorDetails(req.user.id, req.params.monitorId);
    res.json({ details });
  },

  async update(req, res) {
    const monitor = await monitorService.updateMonitor(req.user.id, req.params.monitorId, req.body);
    res.json({ monitor });
  },

  async remove(req, res) {
    const monitor = await monitorService.deleteMonitor(req.user.id, req.params.monitorId);
    res.json({ monitor });
  },
};
