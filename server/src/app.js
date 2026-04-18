import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import monitorRoutes from "./modules/monitors/monitor.routes.js";
import subscriptionRoutes from "./modules/subscription/subscription.routes.js";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware.js";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/monitors", monitorRoutes);
  app.use("/api/subscription", subscriptionRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
