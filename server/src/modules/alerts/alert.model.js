import mongoose from "mongoose";

const alertNotificationSchema = new mongoose.Schema(
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
    },
    status: {
      type: String,
      required: true,
    },
    event: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
      default: "",
    },
    deliveryStatus: {
      type: String,
      enum: ["sent", "failed", "skipped"],
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    checkedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const AlertNotification = mongoose.model("AlertNotification", alertNotificationSchema);
