const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Cek apakah file .env ada (opsional, bisa dihapus kalau udah yakin .env ada)
const envPath = path.resolve(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  console.error(".env file not found at:", envPath);
  process.exit(1); // Keluar kalau .env nggak ada
}

// Load .env file SEBELUM import airdropRoutes
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  console.error("Error loading .env file:", dotenvResult.error);
  process.exit(1);
}

// Import airdropRoutes SETELAH dotenv.config()
const airdropRoutes = require("./server/routes/airdrop");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Middleware untuk logging semua request (opsional, bisa dihapus kalau nggak perlu)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Endpoint untuk login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "defaultpassword";
  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ success: false, error: "Incorrect password" });
  }
});

// Middleware untuk proteksi rute admin
app.use((req, res, next) => {
  if (req.path === "/admin.html") {
    next();
  } else {
    next();
  }
});

app.use(express.static("public"));

// Gunakan rute airdrop
app.use("/api/airdrop", airdropRoutes);

// Tambah rute langsung untuk /api/logout
app.post("/api/logout", (req, res, next) => {
  req.url = "/logout";
  airdropRoutes(req, res, next);
});

// Tambah rute debug untuk memastikan server berjalan (opsional, bisa dihapus)
app.get("/debug", (req, res) => {
  res.json({ message: "Server is running and routes are registered" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});