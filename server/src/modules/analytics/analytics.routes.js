import { Router } from "express";
import { analyticsController } from "./analytics.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.use(authMiddleware);
router.get("/", asyncHandler(analyticsController.dashboard));

export default router;
