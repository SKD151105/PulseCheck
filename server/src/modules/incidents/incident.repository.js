import { Incident } from "./incident.model.js";

export const incidentRepository = {
  create(data) {
    return Incident.create(data);
  },
  findOpenByMonitorId(monitorId) {
    return Incident.findOne({ monitorId, resolvedAt: null }).sort({ startedAt: -1 });
  },
  resolveById(incidentId, payload) {
    return Incident.findByIdAndUpdate(incidentId, payload, {
      returnDocument: "after",
    });
  },
  findRecentByMonitorId(monitorId, limit = 10) {
    return Incident.find({ monitorId }).sort({ startedAt: -1 }).limit(limit).lean();
  },
};
