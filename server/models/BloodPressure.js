// server/models/BloodPressure.js
const mongoose = require("mongoose");

const BloodPressureSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  systolic: {
    type: Number,
    required: true,
  },
  diastolic: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: "24h",
  },
});

module.exports = mongoose.model("BloodPressure", BloodPressureSchema);
