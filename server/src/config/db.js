import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectDb = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info("MongoDB connected");
};
