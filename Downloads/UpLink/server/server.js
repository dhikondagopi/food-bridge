import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import protect from "./middleware/authMiddleware.js";
import { initSocket } from "./socket/socket.js";

dotenv.config();

const app = express();

// ✅ CORS (FIXED for production)
const allowedOrigins = [
  process.env.FRONTEND_URL,   // Netlify URL
  "http://localhost:5173"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

// ✅ Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// ✅ Protected route
app.get("/api/dashboard", protect, (req, res) => {
  res.json({ message: "Protected dashboard", userId: req.userId });
});

// ✅ Health check (IMPORTANT for Render)
app.get("/api/health", (req, res) => res.json({ status: "OK" }));

// ✅ Root
app.get("/", (req, res) => res.json({ message: "🚀 API Running" }));

// ✅ Connect DB
connectDB();

// ✅ Create server
const server = http.createServer(app);

// ✅ Socket.IO setup (FIXED)
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Socket auth middleware
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) return next(new Error("No token"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// ✅ Initialize socket logic
initSocket(io);

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ message: "Server error" });
});

// ✅ PORT (Render compatible)
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});