import { Router } from "express";
import { authController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { createRateLimitMiddleware } from "../../middlewares/rateLimit.middleware.js";
import { RATE_LIMITS } from "../../utils/constants.js";

const router = Router();
const authRateLimit = createRateLimitMiddleware(
  "auth",
  RATE_LIMITS.auth,
  (req) => req.ip
);

router.post("/register", authRateLimit, asyncHandler(authController.register));
router.post("/login", authRateLimit, asyncHandler(authController.login));
router.post("/google", authRateLimit, asyncHandler(authController.google));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", authMiddleware, asyncHandler(authController.logout));
router.get("/me", authMiddleware, asyncHandler(authController.me));

export default router;
