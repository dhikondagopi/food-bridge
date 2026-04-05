import express from "express";
import {
  getConversations,
  getRoomMessages,
  sendDirectMessage,
} from "../controllers/messageController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/conversations", protect, getConversations);
router.get("/room/:room", protect, getRoomMessages);
router.post("/send", protect, sendDirectMessage);

export default router;