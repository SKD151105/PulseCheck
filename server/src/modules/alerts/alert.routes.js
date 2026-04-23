import { Router } from "express";
import { alertController } from "./alert.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/settings", asyncHandler(alertController.getSettings));
router.patch("/settings", asyncHandler(alertController.updateSettings));
router.get("/history", asyncHandler(alertController.listHistory));

export default router;
