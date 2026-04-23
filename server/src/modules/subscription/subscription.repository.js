import { User } from "../auth/auth.model.js";

export const subscriptionRepository = {
  findById(userId) {
    return User.findById(userId);
  },
  findByStripeCustomerId(stripeCustomerId) {
    return User.findOne({ stripeCustomerId });
  },
  findByStripeSubscriptionId(stripeSubscriptionId) {
    return User.findOne({ stripeSubscriptionId });
  },
  updatePlan(userId, plan) {
    return User.findByIdAndUpdate(userId, { plan }, { returnDocument: "after" });
  },
  updateStripeCustomer(userId, stripeCustomerId) {
    return User.findByIdAndUpdate(userId, { stripeCustomerId }, { returnDocument: "after" });
  },
  updateStripeSubscription(userId, payload) {
    return User.findByIdAndUpdate(userId, payload, { returnDocument: "after" });
  },
};
