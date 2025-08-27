const mongoose = require('mongoose');
const { Schema } = mongoose;

const listingSchema = new Schema({
  category: {
    type: String,
    enum: ['Project', 'Product'],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Listing", listingSchema);
