import { io } from "socket.io-client";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const socketUrl = import.meta.env.VITE_SOCKET_URL || apiBaseUrl.replace(/\/api$/, "");

export const socket = io(socketUrl, {
  autoConnect: false,
  reconnection: true,
  transports: ["websocket"],
});

export const connectSocket = (token) => {
  if (!token) {
    return;
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
