const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/excels/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files are allowed."), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
