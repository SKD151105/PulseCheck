import mongoose from "mongoose";
import { PLANS } from "../../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function requiredPassword() {
        return this.authProvider === "local";
      },
      minlength: 6,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    profileImage: {
      type: String,
      default: null,
    },
    plan: {
      type: String,
      enum: Object.values(PLANS),
      default: PLANS.FREE,
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      default: "free",
    },
    subscriptionCancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    subscriptionCurrentPeriodEnd: {
      type: Date,
      default: null,
    },
    alertPreferences: {
      enabled: {
        type: Boolean,
        default: true,
      },
      email: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
      },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
