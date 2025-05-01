const express = require("express");
const router = express.Router();
const db = require("../db/database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Pastikan middleware parsing body ada sebelum multer
router.use(express.urlencoded({ extended: true }));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "defaultpassword";

// Setup multer untuk upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png) are allowed"));
    }
  },
});

// Upload airdrop (sekarang support gambar)
router.post("/upload", upload.single("image"), (req, res) => {
  const { password, title, description, tier, label } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!title || !description || !tier) {
    return res.status(400).json({ error: "Title, description, and tier are required" });
  }
  const airdrop = {
    title,
    description,
    tier,
    label: label || "",
    status: "active",
    createdAt: new Date().toISOString(),
    image: req.file ? `/uploads/${req.file.filename}` : null,
  };
  db.insert(airdrop, (err, newDoc) => {
    if (err) {
      return res.status(500).json({ error: "Failed to upload airdrop" });
    }
    res.status(201).json({ message: "Airdrop uploaded successfully" });
  });
});

// Get all airdrops
router.get("/", (req, res) => {
  db.find({}).sort({ createdAt: -1 }).exec((err, docs) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch airdrops" });
    }
    res.json(docs);
  });
});

// Update airdrop
router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { password, title, description, tier, label } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!title || !description || !tier) {
    return res.status(400).json({ error: "Title, description, and tier are required" });
  }

  // Cari airdrop yang akan diupdate
  db.findOne({ _id: id }, (err, doc) => {
    if (err) {
      return res.status(500).json({ error: "Failed to update airdrop" });
    }
    if (!doc) {
      return res.status(404).json({ error: "Airdrop not found" });
    }

    // Hapus gambar lama jika ada gambar baru
    if (req.file && doc.image) {
      const oldImageName = doc.image.replace("/uploads/", "");
      const oldImagePath = path.join(__dirname, "../../public/uploads", oldImageName);
      if (fs.existsSync(oldImagePath)) {
        fs.unlink(oldImagePath, err => {
          if (err) {
            console.error("Error deleting old image:", err);
          }
        });
      }
    }

    // Update data airdrop
    const updatedAirdrop = {
      title,
      description,
      tier,
      label: label || "",
      status: doc.status,
      createdAt: doc.createdAt,
      image: req.file ? `/uploads/${req.file.filename}` : doc.image,
    };

    db.update({ _id: id }, updatedAirdrop, {}, (err, numAffected) => {
      if (err) {
        return res.status(500).json({ error: "Failed to update airdrop" });
      }
      if (numAffected === 0) {
        return res.status(404).json({ error: "Airdrop not found" });
      }
      res.json({ message: "Airdrop updated successfully" });
    });
  });
});

// Update status airdrop
router.patch("/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  db.update({ _id: id }, { $set: { status } }, {}, (err, numAffected) => {
    if (err) {
      return res.status(500).json({ error: "Failed to update status" });
    }
    if (numAffected === 0) {
      return res.status(404).json({ error: "Airdrop not found" });
    }
    res.json({ message: "Status updated successfully" });
  });
});

// Delete airdrop (sekarang hapus gambar juga)
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.findOne({ _id: id }, (err, doc) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete airdrop" });
    }
    if (!doc) {
      return res.status(404).json({ error: "Airdrop not found" });
    }
    db.remove({ _id: id }, {}, (err, numRemoved) => {
      if (err) {
        return res.status(500).json({ error: "Failed to delete airdrop" });
      }
      if (numRemoved === 0) {
        return res.status(404).json({ error: "Airdrop not found" });
      }
      // Hapus file gambar kalau ada
      if (doc.image) {
        const imageName = doc.image.replace("/uploads/", "");
        const imagePath = path.join(__dirname, "../../public/uploads", imageName);
        if (fs.existsSync(imagePath)) {
          fs.unlink(imagePath, err => {
            if (err) {
              console.error("Error deleting image:", err);
            }
          });
        }
      }
      res.json({ message: "Airdrop deleted successfully" });
    });
  });
});

// Tambah endpoint logout
router.post("/logout", (req, res) => {
  try {
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to logout" });
  }
});

module.exports = router;