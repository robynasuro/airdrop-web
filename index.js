const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

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
console.log('airdropRoutes:', airdropRoutes, 'Type:', typeof airdropRoutes);

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

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

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

app.use(express.json());

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path} from ${req.headers.origin || "unknown"}`);
  if (req.path.startsWith("/socket.io")) {
    console.log("Socket.IO request detected:", req.query);
  }
  next();
});

const requireAuth = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware untuk remove .html dan redirect
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const newPath = req.path.slice(0, -5); // Hapus .html
    return res.redirect(301, newPath);
  }
  next();
});

// Serve static files tanpa ekstensi
app.get('*', (req, res, next) => {
  const filePath = path.join(__dirname, 'public', req.path + '.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "defaultpassword";
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ id: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    return res.status(200).json({ success: true, token });
  } else {
    return res.status(401).json({ success: false, error: "Incorrect password" });
  }
});

app.use((req, res, next) => {
  if (req.path === "/admin") {
    next();
  } else {
    next();
  }
});

app.get("/socket.io/socket.io.js", (req, res) => {
  console.log("Manual request to /socket.io/socket.io.js");
  const socketIoPath = path.resolve(__dirname, "node_modules", "socket.io", "client-dist", "socket.io.js");
  if (fs.existsSync(socketIoPath)) {
    res.sendFile(socketIoPath);
  } else {
    res.status(404).send("Socket.IO client file not found");
  }
});

app.use(express.static("public"));

app.use("/api/airdrop", airdropRoutes);

app.post("/api/logout", (req, res, next) => {
  req.url = "/logout";
  airdropRoutes(req, res, next);
});

app.get("/debug", (req, res) => {
  res.json({ message: "Server is running and routes are registered" });
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

app.get("/admin", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
