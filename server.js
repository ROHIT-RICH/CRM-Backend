const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const Notification = require("./models/Notification");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // you can restrict later to frontend URL
  },
});

// Middleware
app.use(cors());
app.use(express.json());

const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  // Register user with their ID
  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`✅ User registered: ${userId} -> ${socket.id}`);
  });

  // Handle sending notification
  socket.on("send_notification", async ({ receiverId, message, type }) => {
    console.log("🔔 Notification to send:", receiverId, message);

    try {
      const notification = await Notification.create({
        userId: receiverId,
        message,
        type,
      });

      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new_notification", notification);
        console.log("📨 Notification sent to:", receiverId);
      } else {
        console.log("ℹ️ Receiver offline, stored in DB only");
      }
    } catch (err) {
      console.error("❌ Error saving/sending notification:", err);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👋 User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Middleware to attach socket.io to routes
app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  next();
});

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/tasks", require("./routes/taskRoute"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/reset-password", require("./routes/resetPassword"));
app.use("/api/excel", require("./routes/excelRoutes"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/report", require("./routes/reportRoutes"));
app.use("/api/lead", require("./routes/leadRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/sales", require("./routes/SalesRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/admin/sales-lead-updates", require("./routes/adminLeadUpdates"));
app.use("/api/announcements", require("./routes/announcemntRoutes"));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
