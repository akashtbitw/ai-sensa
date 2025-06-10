// server/models/HeartRate.js
const mongoose = require("mongoose");

const HeartRateSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  bpm: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: "24h",
  },
});

module.exports = mongoose.model("HeartRate", HeartRateSchema);
