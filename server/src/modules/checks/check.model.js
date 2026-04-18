import mongoose from "mongoose";
import { MONITOR_STATUS } from "../../utils/constants.js";

const checkLogSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [MONITOR_STATUS.UP, MONITOR_STATUS.DOWN],
      required: true,
    },
    responseTime: {
      type: Number,
      default: null,
    },
    checkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export const CheckLog = mongoose.model("CheckLog", checkLogSchema);
