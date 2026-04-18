import mongoose from "mongoose";
import { MONITOR_STATUS } from "../../utils/constants.js";

const monitorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    interval: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(MONITOR_STATUS),
      default: MONITOR_STATUS.PENDING,
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastResponseTime: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

export const Monitor = mongoose.model("Monitor", monitorSchema);
