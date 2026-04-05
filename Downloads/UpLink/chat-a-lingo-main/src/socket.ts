import { io } from "socket.io-client";

export const socket = io("http://localhost:5001", {
  auth: (cb) => cb({ token: localStorage.getItem("token") }),
  transports: ["websocket"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});