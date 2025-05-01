const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const envPath = path.resolve(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.error(".env file not found at:", envPath);
  process.exit(1);
}

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error("Error loading .env file:", dotenvResult.error);
  process.exit(1);
}

const airdropRoutes = require("./server/routes/airdrop");

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

// Tambah konfigurasi path eksplisit untuk Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io", // Pastiin path eksplisit
});

// Tambah error handling untuk Socket.IO
io.on("error", (error) => {
  console.error("Socket.IO error:", error);
});

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("chat message", (msg) => {
    console.log("message: " + msg);
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });

  // Tambah error handling untuk socket
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

app.use(express.json());

// Tambah logging detail untuk semua request
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path} from ${req.headers.origin || "unknown"}`);
  if (req.path.startsWith("/socket.io")) {
    console.log("Socket.IO request detected:", req.query);
  }
  next();
});

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "defaultpassword";
  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, error: "Incorrect password" });
  }
});

app.use((req, res, next) => {
  if (req.path === "/admin.html") {
    next();
  } else {
    next();
  }
});

// Tambah route manual untuk debug /socket.io/socket.io.js
app.get("/socket.io/socket.io.js", (req, res) => {
  console.log("Manual request to /socket.io/socket.io.js");
  const socketIoPath = path.resolve(__dirname, "node_modules", "socket.io", "client-dist", "socket.io.js");
  if (fs.existsSync(socketIoPath)) {
    res.sendFile(socketIoPath);
  } else {
    res.status(404).send("Socket.IO client file not found");
  }
});

// Static middleware
app.use(express.static("public"));

app.use("/api/airdrop", airdropRoutes);

app.post("/api/logout", (req, res, next) => {
  req.url = "/logout";
  airdropRoutes(req, res, next);
});

app.get("/debug", (req, res) => {
  res.json({ message: "Server is running and routes are registered" });
});

// Tambah error handling untuk server
server.on("error", (error) => {
  console.error("Server error:", error);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});