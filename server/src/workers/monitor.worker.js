import cron from "node-cron";
import { checkService } from "../modules/checks/check.service.js";
import { logger } from "../utils/logger.js";

let task;

export const startMonitorWorker = (io) => {
  if (task) {
    return task;
  }

  task = cron.schedule("* * * * *", async () => {
    logger.debug("Running scheduled monitor cycle");
    await checkService.processDueMonitors(io);
  });

  logger.info("Monitor worker started");

  setTimeout(() => {
    checkService.processDueMonitors(io).catch((error) => {
      logger.error("Initial monitor run failed", { message: error.message });
    });
  }, 2000);

  return task;
};
