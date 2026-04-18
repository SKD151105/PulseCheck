import nodemailer from "nodemailer";
import { authRepository } from "../auth/auth.repository.js";
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

export const alertService = {
  async sendStatusChangeAlerts(payload) {
    const user = await authRepository.findById(payload.userId);

    if (!user) {
      logger.warn("Alert delivery skipped: user missing", { userId: payload.userId });
      return;
    }

    const message = buildAlertMessage(payload);
    const emailTransporter = getMailTransporter();

    if (emailTransporter) {
      try {
        await emailTransporter.sendMail({
          from: process.env.ALERT_GMAIL_USER,
          to: user.email,
          subject: message.subject,
          text: message.text,
        });

        logger.info("Email alert sent", { userId: payload.userId, email: user.email, status: payload.status });
      } catch (error) {
        logger.error("Email alert failed", { userId: payload.userId, message: error.message });
      }
    } else {
      logger.warn("Email alert skipped: Gmail transport not configured");
    }
  },
};
