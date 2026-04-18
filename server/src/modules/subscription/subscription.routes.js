import { Router } from "express";
import { subscriptionController } from "./subscription.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/", asyncHandler(subscriptionController.current));
router.patch("/", asyncHandler(subscriptionController.update));

export default router;
