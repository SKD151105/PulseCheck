import { User } from "../auth/auth.model.js";

export const subscriptionRepository = {
  findById(userId) {
    return User.findById(userId);
  },
  updatePlan(userId, plan) {
    return User.findByIdAndUpdate(userId, { plan }, { returnDocument: "after" });
  },
};
