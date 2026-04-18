import "dotenv/config";
import http from "http";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { createSocketServer } from "./sockets/socket.js";
import { startMonitorWorker } from "./workers/monitor.worker.js";

const bootstrap = async () => {
  await connectDb();
  connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  startMonitorWorker(io);

  const port = process.env.PORT || 5000;

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
