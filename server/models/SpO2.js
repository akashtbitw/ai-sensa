// server/models/SpO2.js
const mongoose = require("mongoose");

const SpO2Schema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  level: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: "24h",
  },
});

module.exports = mongoose.model("SpO2", SpO2Schema);
