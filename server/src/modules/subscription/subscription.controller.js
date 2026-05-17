import { subscriptionService } from "./subscription.service.js";

export const subscriptionController = {
  async current(req, res) {
    const subscription = await subscriptionService.getCurrentPlan(req.user.id);
    res.json({ subscription });
  },

  async confirmCheckout(req, res) {
    const subscription = await subscriptionService.confirmCheckoutSession(
      req.user.id,
      req.query.sessionId
    );
    res.json({ subscription });
  },

  async update(req, res) {
    const subscription = await subscriptionService.updatePlan(req.user.id, req.body.plan);
    res.json({ subscription });
  },

  async checkout(req, res) {
    const session = await subscriptionService.createCheckoutSession(req.user.id);
    res.json(session);
  },

  async webhook(req, res) {
    const result = await subscriptionService.handleStripeWebhook(req.body, req.headers["stripe-signature"]);
    res.json(result);
  },
};
