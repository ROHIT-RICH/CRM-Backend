const express = require('express');
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Lead = require('../models/Lead');
const User = require('../models/Employee');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Notification = require("../models/Notification");
const SalesLeadUpdate = require("../models/SalesLeadUpdate");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads/leads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `lead_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ dest: "uploads/leads" });

// ================== Routes ==================

// GET

router.get("/recent", async (req, res) => {
  try {
    const recentLeads = await Lead.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("assignedTo"); // pull only what you need

    // Format response
    const formatted = recentLeads.map((lead) => ({
      id: lead._id,
      roCode: lead.roCode,
      name: lead.name,
      contact: lead.contact,
      state: lead.state,
      createdAt: lead.createdAt,
      assignedTo: lead.assignedTo?.name,
      assignedToEmail: lead.assignedTo?.email || null,
      status: lead.status,
    }));

    

    res.status(200).json(formatted);
    // console.log("formattted", recentLeads)
  } catch (err) {
    console.error("❌ Error fetching recent leads:", err);
    res.status(500).json({ error: "Failed to fetch recent leads" });
  }
});

// POST: Create a new lead manually
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roCode, name, address, state, contact, assignedTo } = req.body;

    const employee = await User.findOne({ email: assignedTo });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const lead = new Lead({
      roCode,
      name,
      address,
      state,
      contact,
      assignedTo: employee._id,
      source: 'manual',
    });

    await lead.save();
    const notification = await Notification.create({
      userId: employee._id,
      message: `A new lead "${name}" has been assigned to you.`,
    });

    // Emit to connected client
    const socketId = req.connectedUsers.get(employee._id.toString());
    if (socketId) {
      req.io.to(socketId).emit("new_notification", notification);
    }
    res.status(201).json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// POST: Bulk create via JSON
router.post('/bulk', authMiddleware, async (req, res) => {
  try {
    const { leads, assignedTo, excelFileName } = req.body;

    const employee = await User.findOne({ email: assignedTo });
    if (!employee) return res.status(404).json({ error: 'Assigned employee not found' });

    const formattedLeads = leads.map((lead) => ({
      roCode: lead.roCode,
      name: lead.name,
      address: lead.address,
      state: lead.state,
      contact: lead.contact,
      assignedTo: employee._id,
      source: 'excel',
      excelFileName,
    }));

    const savedLeads = await Lead.insertMany(formattedLeads);

    const notification = await Notification.create({
      userId: employee._id,
      message: `${savedLeads.length} new leads have been assigned to you.`,
    });

    const socketId = req.connectedUsers.get(employee._id.toString());
    if (socketId) {
      req.io.to(socketId).emit("new_notification", notification);
    }
    res.status(201).json(savedLeads);
  } catch (err) {
    console.error('Bulk lead upload error:', err);
    res.status(500).json({ error: 'Failed to upload leads' });
  }
});




// POST: Upload Excel file
router.post(
  "/upload-excel",
  upload.single("excelFile"),
  authMiddleware,
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      let employee;
      if (req.body.assignedTo) {
        // Check if it's ObjectId or email
        if (/^[0-9a-fA-F]{24}$/.test(req.body.assignedTo)) {
          employee = await User.findById(req.body.assignedTo);
        } else {
          employee = await User.findOne({ email: req.body.assignedTo });
        }
      } else {
        employee = await User.findById(req.user.id);
      }

      if (!employee) return res.status(404).json({ error: "Assigned employee not found" });

      const leads = jsonData
        .filter(item => item["RO Code"] && item["Name"])
        .map((item) => ({
          roCode: item["RO Code"].toString().trim(),
          name: item["Name"].toString().trim(),
          address: item["Address"] || "",
          state: item["State"] || "",
          contact: item["Contact"] || "",
          assignedTo: employee._id,
          source: "excel",
          excelFileName: file.originalname,
        }));

      if (leads.length === 0) {
        return res.status(400).json({ error: "No valid leads found in the file" });
      }

      await Lead.insertMany(leads);

      const notification = await Notification.create({
        userId: employee._id,
        message: `${leads.length} leads uploaded via Excel have been assigned to you.`,
      });

      const socketId = req.connectedUsers.get(employee._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("new_notification", notification);
      }

      res.status(200).json({ message: "Leads uploaded successfully", count: leads.length });
    } catch (error) {
      console.error("Excel upload failed:", error);
      res.status(500).json({ error: "Excel upload failed" });
    }
  }
);


// GET: Leads (admin & HR = all, employee = only assigned)
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "admin" || req.user.role === "HR") {
      // Admin & HR can see all leads
      query = {};
    } else if (req.user.role === "employee") {
      // Employee only sees their assigned leads
      query.assignedTo = req.user.id;
    }

    const leads = await Lead.find(query)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    const formattedLeads = leads.map((lead) => ({
      _id: lead._id,
      roCode: lead.roCode,
      name: lead.name,
      address: lead.address,
      state: lead.state,
      contact: lead.contact,
      assignedTo: lead.assignedTo,
      source: lead.source,
      excelFileName: lead.source === "excel" ? lead.excelFileName : null,
      createdAt: lead.createdAt,
    }));

    res.status(200).json(formattedLeads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});


// GET: Leads assigned to a specific employee by ID
router.get("/assigned/:id", authMiddleware, async (req, res) => {
  try {
    const employeeId = req.params.id;

    const leads = await Lead.find({ assignedTo: employeeId })
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    if (!leads.length) {
      return res.status(404).json({ message: "No leads found for this employee" });
    }

    res.status(200).json(leads);
  } catch (error) {
    console.error("Error fetching assigned leads:", error);
    res.status(500).json({ error: "Failed to fetch assigned leads" });
  }
});


// GET /api/lead/my/summary
router.get("/my/summary", authMiddleware, async (req, res) => {
  try {
    const userIdStr = (req.user && (req.user.id || req.user._id || req.user.userId))?.toString();
    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // 1) Total from Lead collection
    const totalLeads = await Lead.countDocuments({ assignedTo: userId });

    // 2) Get all leadIds assigned to this user (so we only consider their leads)
    const leadIds = await Lead.find({ assignedTo: userId }).distinct("_id");

    // If no leads, short-circuit
    if (!leadIds.length) {
      return res.json({
        total: 0,
        completed: 0,
        pending: 0,
        followup: 0,
        notInterested: 0,
      });
    }

    // 3) Latest status per lead from SalesLeadUpdate (only for the user's leads)
    const latestUpdates = await SalesLeadUpdate.aggregate([
      { $match: { leadId: { $in: leadIds } } },
      // If your schema has timestamps, createdAt works; _id fallback ensures order even if createdAt missing
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: "$leadId",
          latestStatus: { $first: "$status" },
        },
      },
    ]);

    // 4) Count by normalized status
    const norm = (s) => {
      if (!s) return "";
      const x = s.toString().trim().toLowerCase();
      if (x === "completed" || x === "complete") return "completed";
      if (x === "pending") return "pending";
      if (["follow-up", "follow up", "followup"].includes(x)) return "followup";
      if (["not interested", "not_interested", "notinterested"].includes(x)) return "notInterested";
      return ""; // unknown / ignore
    };

    const summary = {
      total: totalLeads,
      completed: 0,
      pending: 0,
      followup: 0,
      notInterested: 0,
    };

    latestUpdates.forEach((u) => {
      const k = norm(u.latestStatus);
      if (k && k in summary) summary[k]++;
    });

    // OPTIONAL: If you want leads with NO updates counted as Pending, uncomment:
    // const leadsWithUpdates = new Set(latestUpdates.map(u => u._id.toString()));
    // const noUpdateCount = leadIds.filter(id => !leadsWithUpdates.has(id.toString())).length;
    // summary.pending += noUpdateCount;

    // Leads with no updates should be counted as Pending
    const leadsWithUpdates = new Set(latestUpdates.map(u => u._id.toString()));
    const noUpdateCount = leadIds.filter(id => !leadsWithUpdates.has(id.toString())).length;
    summary.pending += noUpdateCount;

    res.json(summary);
  } catch (error) {
    console.error("Error in lead summary:", error);
    res.status(500).json({ error: "Failed to fetch lead summary" });
  }
});

// Admin 
router.get("/summary", async (req, res) => {
  try {
    // total leads from Lead collection
    const totalLeads = await Lead.countDocuments();

    // group latest updates by status
    const statusCounts = await SalesLeadUpdate.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // convert into object { pending: x, completed: y ... }
    const summary = {
      total: totalLeads,
      completed: 0,
      pending: 0,
      followup: 0,
      notInterested: 0
    };

    statusCounts.forEach((s) => {
      switch (s._id) {
        case "Completed":
          summary.completed = s.count;
          break;
        case "Pending":
          summary.pending = s.count;
          break;
        case "Follow-Up":
          summary.followup = s.count;
          break;
        case "Not Interested":
          summary.notInterested = s.count;
          break;
      }
    });

    res.json(summary);
  } catch (err) {
    console.error("❌ Lead summary error:", err);
    res.status(500).json({ error: "Failed to fetch lead summary", details: err.message });
  }
});


module.exports = router;
