// server/routes/bloodPressure.js
const express = require("express");
const router = express.Router();
const BloodPressure = require("../models/BloodPressure");

// Get all blood pressure data for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Optional query parameters for filtering
    const { startDate, endDate, limit } = req.query;

    const query = { userId };

    // Add date range filter if provided
    if (startDate || endDate) {
      query.timestamp = {};

      if (startDate) {
        // Validate startDate
        const startDateObj = new Date(startDate);
        if (isNaN(startDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
        query.timestamp.$gte = startDateObj;
      }

      if (endDate) {
        // Validate endDate
        const endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
        query.timestamp.$lte = endDateObj;
      }
    }

    let bloodPressureData;

    // For requests with no date range (live/latest mode)
    if (!startDate && !endDate) {
      // Parse and validate limit for non-time range queries
      const parsedLimit = parseInt(limit) || 50; // Default to 50 if not specified
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ message: "Invalid limit parameter" });
      }

      bloodPressureData = await BloodPressure.find(query)
        .sort({ timestamp: -1 }) // Sort descending (newest first)
        .limit(parsedLimit)
        .then((results) => results.reverse()); // Reverse back to ascending for charting
    } else {
      // For time-range requests, get ALL data in the range, ensuring we have the right sorting
      bloodPressureData = await BloodPressure.find(query).sort({
        timestamp: 1,
      });
    }

    res.json(bloodPressureData);
  } catch (err) {
    console.error("Error fetching blood pressure data:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
