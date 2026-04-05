import Message from "../models/Message.js";
import User from "../models/User.js";

/* GET all conversations for current user */
export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all rooms this user participated in
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name avatar")
      .populate("receiver", "name avatar");

    // Group by room — keep only the latest message per room
    const roomMap = new Map();
    for (const msg of messages) {
      if (!roomMap.has(msg.room)) {
        roomMap.set(msg.room, msg);
      }
    }

    // Count unread per room
    const conversations = await Promise.all(
      Array.from(roomMap.values()).map(async (msg) => {
        const unread = await Message.countDocuments({
          room: msg.room,
          receiver: userId,
          read: false,
        });
        return { ...msg.toObject(), unread };
      })
    );

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* GET messages in a room */
export const getRoomMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.userId;

    const messages = await Message.find({ room })
      .sort({ createdAt: 1 })
      .populate("sender", "name avatar");

    // Mark messages as read
    await Message.updateMany(
      { room, receiver: userId, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* SEND direct message */
export const sendDirectMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.userId;

    if (!text?.trim()) {
      return res.status(400).json({ message: "Message text required" });
    }

    // Room is sorted sender-receiver IDs so it's always the same regardless of who starts
    const room = [senderId, receiverId].sort().join("-");

    const message = await Message.create({
      room,
      sender: senderId,
      receiver: receiverId,
      text: text.trim(),
      type: "direct",
    });

    const populated = await message.populate("sender", "name avatar");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};