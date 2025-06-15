const express = require("express");
const router = express.Router();
const { generateMedicalInsights } = require("../utils/geminiAI");
const User = require("../models/User");

router.post("/insight", async (req, res) => {
  try {
    // Extract the analysis data from request body
    const { userId, ...analysisData } = req.body;
    const user = await User.findOne({ userId });

    // Validate required data
    if (!analysisData) {
      return res.status(400).json({
        success: false,
        error: "Analysis data is required",
      });
    }

    // Validate that we have at least some vital signs data
    const hasVitalSigns =
      analysisData.currentHeartRate ||
      analysisData.currentBP ||
      analysisData.currentSpo2;

    if (!hasVitalSigns) {
      return res.status(400).json({
        success: false,
        error: "At least one current vital sign reading is required",
      });
    }

    // Generate AI insights
    const insights = await generateMedicalInsights(analysisData);
    await user.addNotification(
      "AI MEDICAL INSIGHT",
      insights.insights,
      "health_report"
    );
    res.status(200).json({
      success: true,
      message: "Medical insights generated and notification added successfully",
    });
  } catch (error) {
    console.error("Error in insight route:", error);

    res.status(500).json({
      success: false,
      error: "Failed to generate medical insights",
      message: error.message,
    });
  }
});

module.exports = router;
