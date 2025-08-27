const multer = require("multer");
const path = require("path");

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/tasks"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 1687981234567.xlsx
  },
});

// File filter: allow Excel, PDF, Word
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
    "application/vnd.ms-excel", // xls
    "application/pdf", // pdf
    "application/msword", // doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel, PDF, and Word files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
