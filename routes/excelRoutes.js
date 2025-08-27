const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Multer config to store uploaded file in /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Create this folder if not exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Route to handle Excel upload
router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "No file uploaded" });
  }

  return res.status(200).json({
    msg: "File uploaded successfully",
    filename: req.file.filename,
  });
});

module.exports = router;
