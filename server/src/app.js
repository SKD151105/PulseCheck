import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import monitorRoutes from "./modules/monitors/monitor.routes.js";
import subscriptionRoutes from "./modules/subscription/subscription.routes.js";
import { subscriptionController } from "./modules/subscription/subscription.controller.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware.js";
import { requestLoggerMiddleware } from "./middlewares/request.middleware.js";
import { asyncHandler } from "./utils/asyncHandler.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.post(
    "/api/subscription/webhook",
    express.raw({ type: "application/json" }),
    asyncHandler(subscriptionController.webhook)
  );
  app.use(express.json());
  app.use(requestLoggerMiddleware);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/monitors", monitorRoutes);
  app.use("/api/subscription", subscriptionRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
