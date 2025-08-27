const express = require('express');
const router = express.Router();


const SalesLeadUpdate = require('../models/SalesLeadUpdate'); 
const SalesLead = require('../models/Lead'); 

router.post("/sales-updates", async (req, res) => {
    try {
        const { leadId, employeeId, description, status } = req.body;

        if (!leadId || !employeeId || !description || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const update = new SalesLeadUpdate({
            leadId,
            employeeId,
            description,
            status,
        });

        await update.save();
        res.status(201).json({ message: "Lead update saved", update });
    } catch (err) {
        console.error("Error saving sales update:", err.message);
        res.status(500).json({ error: "Failed to save sales update." });
    }
});

module.exports = router;
