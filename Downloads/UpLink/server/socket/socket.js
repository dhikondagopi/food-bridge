const onlineUsers = new Map();

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log("⚡ Connected:", userId);

    socket.on("user_online", (userData) => {
      onlineUsers.set(userId, {
        userId,
        name: userData.name,
        nativeLanguage: userData.nativeLanguage,
        learningLanguage: userData.learningLanguage,
        bio: userData.bio || "",
        avatar: userData.avatar || "",
        socketId: socket.id,
        connectedAt: new Date(),
      });
      io.emit("online_users_updated", Array.from(onlineUsers.values()));
    });

    socket.on("get_online_users", () => {
      socket.emit("online_users_updated", Array.from(onlineUsers.values()));
    });

    socket.on("call_request", ({ toUserId }) => {
      const targetUser = onlineUsers.get(toUserId);
      if (!targetUser) { socket.emit("call_error", { message: "User is no longer online" }); return; }
      const callerInfo = onlineUsers.get(userId);
      io.to(targetUser.socketId).emit("incoming_call", {
        fromUserId: userId,
        fromName: callerInfo?.name || "Someone",
        fromSocketId: socket.id,
      });
    });

    socket.on("call_accepted", ({ toUserId }) => {
      const callerInfo = onlineUsers.get(toUserId);
      if (!callerInfo) return;
      const room = [userId, toUserId].sort().join("-");
      socket.join(room);
      io.to(callerInfo.socketId).emit("call_accepted", { room, fromUserId: userId });
      socket.emit("call_accepted", { room, fromUserId: toUserId });
    });

    socket.on("call_rejected", ({ toUserId }) => {
      const callerInfo = onlineUsers.get(toUserId);
      if (!callerInfo) return;
      io.to(callerInfo.socketId).emit("call_rejected", { fromUserId: userId });
    });

    socket.on("join_room", (room) => {
      socket.join(room);
      socket.to(room).emit("user-connected", socket.id);
      console.log(`🚪 ${userId} joined room: ${room}`);
    });

    socket.on("send_message", (data) => {
      socket.to(data.room).emit("receive_message", { text: data.text, sender: userId });
    });

    socket.on("leave_room", (room) => {
      socket.leave(room);
      socket.to(room).emit("user-disconnected", userId);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("online_users_updated", Array.from(onlineUsers.values()));
      console.log(`❌ Disconnected: ${userId}`);
    });
  });
};