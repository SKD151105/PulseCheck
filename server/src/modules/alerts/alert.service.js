import nodemailer from "nodemailer";
import { authRepository } from "../auth/auth.repository.js";
import { alertRepository } from "./alert.repository.js";
import { ApiError } from "../../utils/ApiError.js";
import { logger } from "../../utils/logger.js";

let mailTransporter;

const getMailTransporter = () => {
  if (!process.env.ALERT_GMAIL_USER || !process.env.ALERT_GMAIL_APP_PASSWORD) {
    return null;
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ALERT_GMAIL_USER,
        pass: process.env.ALERT_GMAIL_APP_PASSWORD,
      },
    });
  }

  return mailTransporter;
};

const buildAlertMessage = ({ url, status, incidentEvent, checkedAt, responseTime }) => {
  const eventLabel = incidentEvent === "resolved" ? "recovered" : "changed status";
  const responseLabel = typeof responseTime === "number" ? `${responseTime}ms` : "failed request";

  return {
    subject: `[PulseCheck] ${url} is ${status}`,
    text: [
      `PulseCheck alert`,
      ``,
      `Monitor: ${url}`,
      `Status: ${status}`,
      `Event: ${eventLabel}`,
      `Checked at: ${new Date(checkedAt).toISOString()}`,
      `Response: ${responseLabel}`,
    ].join("\n"),
  };
};

const serializeSettings = (user) => ({
  enabled: user.alertPreferences?.enabled ?? true,
  email: user.alertPreferences?.email || user.email,
});

const serializeNotification = (notification) => ({
  id: notification._id.toString(),
  url: notification.url,
  status: notification.status,
  event: notification.event,
  recipientEmail: notification.recipientEmail,
  deliveryStatus: notification.deliveryStatus,
  reason: notification.reason,
  checkedAt: notification.checkedAt,
  createdAt: notification.createdAt,
});

const normalizeAlertEmail = (value) => value?.trim().toLowerCase() || "";

const recordNotification = async (payload) => {
  try {
    await alertRepository.create(payload);
  } catch (error) {
    logger.error("Alert history write failed", { message: error.message });
  }
};

export const alertService = {
  async getAlertSettings(userId) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return serializeSettings(user);
  },

  async updateAlertSettings(userId, payload) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : user.alertPreferences?.enabled ?? true;
    const email = normalizeAlertEmail(payload.email ?? user.alertPreferences?.email ?? "");

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Please enter a valid alert email");
    }

    const updatedUser = await authRepository.updateAlertPreferences(userId, { enabled, email });

    return serializeSettings(updatedUser);
  },

  async getNotificationHistory(userId) {
    const notifications = await alertRepository.findRecentByUserId(userId);
    return notifications.map(serializeNotification);
  },

  async sendStatusChangeAlerts(payload) {
    const user = await authRepository.findById(payload.userId);

    if (!user) {
      logger.warn("Alert delivery skipped: user missing", { userId: payload.userId });
      return;
    }

    const alertPreferences = user.alertPreferences || {};
    const recipientEmail = alertPreferences.email || user.email;
    const event = payload.incidentEvent || "status_change";

    if (alertPreferences.enabled === false) {
      await recordNotification({
        userId: payload.userId,
        url: payload.url,
        status: payload.status,
        event,
        recipientEmail,
        deliveryStatus: "skipped",
        reason: "Alerts disabled",
        checkedAt: payload.checkedAt,
      });
      logger.info("Email alert skipped: alerts disabled", { userId: payload.userId });
      return;
    }

    const message = buildAlertMessage(payload);
    const emailTransporter = getMailTransporter();

    if (emailTransporter) {
      try {
        await emailTransporter.sendMail({
          from: process.env.ALERT_GMAIL_USER,
          to: recipientEmail,
          subject: message.subject,
          text: message.text,
        });

        await recordNotification({
          userId: payload.userId,
          url: payload.url,
          status: payload.status,
          event,
          recipientEmail,
          deliveryStatus: "sent",
          checkedAt: payload.checkedAt,
        });

        logger.info("Email alert sent", { userId: payload.userId, email: recipientEmail, status: payload.status });
      } catch (error) {
        await recordNotification({
          userId: payload.userId,
          url: payload.url,
          status: payload.status,
          event,
          recipientEmail,
          deliveryStatus: "failed",
          reason: error.message,
          checkedAt: payload.checkedAt,
        });
        logger.error("Email alert failed", { userId: payload.userId, message: error.message });
      }
    } else {
      await recordNotification({
        userId: payload.userId,
        url: payload.url,
        status: payload.status,
        event,
        recipientEmail,
        deliveryStatus: "skipped",
        reason: "Email transport not configured",
        checkedAt: payload.checkedAt,
      });
      logger.warn("Email alert skipped: Gmail transport not configured");
    }
  },
};
