import cron from "node-cron";
import { checkService } from "../modules/checks/check.service.js";

let task;

export const startMonitorWorker = (io) => {
  if (task) {
    return task;
  }

  task = cron.schedule("* * * * *", async () => {
    await checkService.processDueMonitors(io);
  });

  setTimeout(() => {
    checkService.processDueMonitors(io).catch((error) => {
      console.error("Initial monitor run failed:", error.message);
    });
  }, 2000);

  return task;
};
