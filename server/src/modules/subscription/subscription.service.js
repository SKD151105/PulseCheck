import { subscriptionRepository } from "./subscription.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { PLANS, PLAN_LIMITS } from "../../utils/constants.js";
import { monitorRepository } from "../monitors/monitor.repository.js";

const getStripe = async () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(503, "Stripe is not configured");
  }

  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const serializeSubscription = (user) => ({
  plan: user.plan,
  limits: PLAN_LIMITS[user.plan],
  status: user.subscriptionStatus,
  cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
  currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
});

const planForStripeStatus = (status) =>
  ["active", "trialing"].includes(status) ? PLANS.PRO : PLANS.FREE;

const toSubscriptionPayload = ({ subscription, customerId }) => ({
  plan: planForStripeStatus(subscription.status),
  stripeCustomerId: customerId || subscription.customer,
  stripeSubscriptionId: subscription.id,
  subscriptionStatus: subscription.status,
  subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  subscriptionCurrentPeriodEnd: subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null,
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
    if (process.env.ALLOW_MANUAL_PLAN_UPDATES !== "true") {
      throw new ApiError(403, "Plan changes are managed through Stripe checkout");
    }

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

  async createCheckoutSession(userId) {
    if (!process.env.STRIPE_PRO_PRICE_ID) {
      throw new ApiError(503, "Stripe price is not configured");
    }

    const user = await subscriptionRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const stripe = await getStripe();
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id.toString() },
      });
      stripeCustomerId = customer.id;
      await subscriptionRepository.updateStripeCustomer(user.id, stripeCustomerId);
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      success_url: `${clientUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/?billing=cancelled`,
      metadata: { userId: user.id.toString() },
      subscription_data: {
        metadata: { userId: user.id.toString() },
      },
    });

    return { url: session.url };
  },

  async confirmCheckoutSession(userId, sessionId) {
    if (!sessionId) {
      throw new ApiError(400, "Checkout session id is required");
    }

    const user = await subscriptionRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.metadata?.userId !== user.id.toString()) {
      throw new ApiError(403, "Checkout session does not belong to this user");
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      throw new ApiError(409, "Checkout session is not complete yet");
    }

    const stripeSubscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    if (!stripeSubscription) {
      throw new ApiError(409, "Stripe subscription is not available yet");
    }

    const updatedUser = await subscriptionRepository.updateStripeSubscription(
      user.id,
      toSubscriptionPayload({
        subscription: stripeSubscription,
        customerId: session.customer,
      })
    );

    return serializeSubscription(updatedUser);
  },

  async handleStripeWebhook(rawBody, signature) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new ApiError(503, "Stripe webhook is not configured");
    }

    const stripe = await getStripe();
    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new ApiError(400, "Invalid Stripe webhook signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await subscriptionRepository.updateStripeSubscription(
          userId,
          toSubscriptionPayload({
            subscription,
            customerId: session.customer,
          })
        );
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const user =
        (subscription.metadata?.userId && (await subscriptionRepository.findById(subscription.metadata.userId))) ||
        (await subscriptionRepository.findByStripeSubscriptionId(subscription.id)) ||
        (await subscriptionRepository.findByStripeCustomerId(subscription.customer));

      if (user) {
        await subscriptionRepository.updateStripeSubscription(
          user.id,
          toSubscriptionPayload({ subscription })
        );
      }
    }

    return { received: true };
  },
};
