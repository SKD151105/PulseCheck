import { subscriptionService } from "./subscription.service.js";

export const subscriptionController = {
  async current(req, res) {
    const subscription = await subscriptionService.getCurrentPlan(req.user.id);
    res.json({ subscription });
  },

  async update(req, res) {
    const subscription = await subscriptionService.updatePlan(req.user.id, req.body.plan);
    res.json({ subscription });
  },
};
