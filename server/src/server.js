import "dotenv/config";
import http from "http";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { createSocketServer } from "./sockets/socket.js";
import { startMonitorWorker } from "./workers/monitor.worker.js";
import { logger } from "./utils/logger.js";

const bootstrap = async () => {
  logger.info("Starting PulseCheck server");
  await connectDb();
  connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  startMonitorWorker(io);

  const port = process.env.PORT || 5000;

  server.listen(port, () => {
    logger.info("Server listening", { port });
  });
};

bootstrap().catch((error) => {
  logger.error("Failed to start server", { message: error.message });
  process.exit(1);
});
