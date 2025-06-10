// server/models/FallDetection.js
const mongoose = require("mongoose");

const FallDetectionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  severity: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  location: {
    type: String,
    default: "Unknown",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: "24h",
  },
});

module.exports = mongoose.model("FallDetection", FallDetectionSchema);
