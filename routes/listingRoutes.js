const express = require('express');
const Listing = require('../models/Listing');

const router = express.Router();

// Create a new listing
router.post('/', async (req, res) => {
    try {
        const { category, name } = req.body;

        if (!category || !name) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const listing = new Listing({ category, name });
        await listing.save();

        res.status(201).json(listing);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get listings by category
router.get('/:category', async (req, res) => {
    try {
        const categoryRegex = new RegExp(`^${req.params.category}$`, 'i');
        const listings = await Listing.find({ category: categoryRegex });
        res.json(listings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/', async (req, res) => {
  try {
    const listings = await Listing.find();
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
