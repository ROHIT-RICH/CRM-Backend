const express = require("express");
const router = express.Router();
const SalesLeadUpdate = require("../models/SalesLeadUpdate");

router.get("/", async (req, res) => {
  try {
    const { status } = req.query; // Optional filter
    const filter = status ? { status } : {};

    const updates = await SalesLeadUpdate.find(filter)
      .populate({
        path: "leadId",
        select: "roCode name contact address state",
      })
      .sort({ createdAt: -1 });

    res.json(updates);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales lead updates" });
  }
});

module.exports = router;
