import { Router } from "express";
import { monitorController } from "./monitor.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { createRateLimitMiddleware } from "../../middlewares/rateLimit.middleware.js";
import { RATE_LIMITS } from "../../utils/constants.js";

const router = Router();
const monitorRateLimit = createRateLimitMiddleware(
  "create-monitor",
  RATE_LIMITS.createMonitor,
  (req) => req.user.id
);

router.use(authMiddleware);
router.get("/", asyncHandler(monitorController.list));
router.post("/", monitorRateLimit, asyncHandler(monitorController.create));
router.get("/:monitorId/details", asyncHandler(monitorController.details));
router.patch("/:monitorId", asyncHandler(monitorController.update));
router.delete("/:monitorId", asyncHandler(monitorController.remove));

export default router;
