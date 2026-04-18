import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

export const authMiddleware = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, plan: payload.plan };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};
