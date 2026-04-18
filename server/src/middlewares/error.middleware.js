import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

export const notFoundMiddleware = (_req, _res, next) => {
  next(new ApiError(404, "Route not found"));
};

export const errorMiddleware = (error, _req, res, _next) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: "A resource with this value already exists",
    });
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  logger.error("Unhandled application error", {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  return res.status(500).json({
    message: "Internal server error",
  });
};
