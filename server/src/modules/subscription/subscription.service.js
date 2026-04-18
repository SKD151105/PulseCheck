import { subscriptionRepository } from "./subscription.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { PLANS, PLAN_LIMITS } from "../../utils/constants.js";
import { monitorRepository } from "../monitors/monitor.repository.js";

const serializeSubscription = (user) => ({
  plan: user.plan,
  limits: PLAN_LIMITS[user.plan],
});

export const subscriptionService = {
  async getCurrentPlan(userId) {
    const user = await subscriptionRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return serializeSubscription(user);
  },

  async updatePlan(userId, plan) {
    if (!Object.values(PLANS).includes(plan)) {
      throw new ApiError(400, "Invalid plan");
    }

    if (plan === PLANS.FREE) {
      const totalMonitors = await monitorRepository.countByUserId(userId);

      if (totalMonitors > PLAN_LIMITS.FREE.maxMonitors) {
        throw new ApiError(403, "Reduce your monitor count before moving to the FREE plan");
      }
    }

    const user = await subscriptionRepository.updatePlan(userId, plan);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return serializeSubscription(user);
  },
};
