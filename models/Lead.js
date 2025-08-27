const mongoose = require('mongoose');
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    roCode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'excel'],
      default: 'manual',
    },
    excelFileName: {
      type: String, // filename or path of uploaded Excel file
    },
     description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
