const User = require("../models/Employee");
const bcrypt = require("bcryptjs");

exports.all = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json(user);
};

exports.update = async (req, res) => {
  const { name, phone, oldPassword, password } = req.body;
  const updates = {};

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (name) updates.name = name;
  if (phone) updates.phone = phone;

  if (password) {
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Old password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    updates.password = await bcrypt.hash(password, salt);
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
  }).select("-password");

  res.json({ msg: "Profile updated successfully", user: updatedUser });
};