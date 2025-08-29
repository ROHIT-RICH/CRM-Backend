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

// ===== CORS configuration =====
// Adjust this to the exact deployed frontend origin.
const FRONTEND_ORIGIN = "https://echopulse.petrotechindia.com";

// If using cookies or Authorization headers, keep credentials true
// and DO NOT use "*" for origin.
const corsOptions = {
  origin: FRONTEND_ORIGIN,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"], // add any custom headers used by the client
  credentials: true, // set true only if sending cookies or auth credentials
  optionsSuccessStatus: 204
};

// Apply CORS BEFORE any routes/middleware that might handle requests
app.use(cors(corsOptions));

// Ensure OPTIONS preflight always returns the right headers
app.options("*", cors(corsOptions));

// JSON parsing
app.use(express.json());

// ===== Socket.IO with matching CORS =====
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// Optionally, to customize preflight for Socket.IO further:
// io.engine.on("headers", (headers, req) => {
//   headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN;
//   headers["Access-Control-Allow-Credentials"] = "true";
// });

const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ New client connected:", socket.id);

  socket.on("register", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`✅ User registered: ${userId} -> ${socket.id}`);
  });

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

// Attach io and connectedUsers to requests
app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  next();
});

// ===== Routes =====
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
app.use("/api", require("./routes/SalesRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/admin/sales-lead-updates", require("./routes/adminLeadUpdates"));
app.use("/api", require("./routes/announcemntRoutes"));

// ===== MongoDB =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== Start server =====
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
