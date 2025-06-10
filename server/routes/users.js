// server/routes/users.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { clerkClient } = require("@clerk/clerk-sdk-node");

// Create or update user profile during onboarding
router.post("/onboarding", async (req, res) => {
  try {
    const {
      userId,
      name,
      age,
      gender,
      height,
      weight,
      normalHeartRate,
      normalBP,
      normalSpO2,
      healthConditions, // Changed from disease
      medications, // Now expects array of objects
      caregivers,
    } = req.body;

    // Basic validation
    if (
      !name ||
      !age ||
      !gender ||
      !height ||
      !weight ||
      !normalHeartRate ||
      !normalBP ||
      !normalSpO2 ||
      !caregivers ||
      !caregivers.length ||
      !caregivers[0].name ||
      !caregivers[0].email
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user already exists
    let user = await User.findOne({ userId });

    if (user) {
      // Update existing user
      user.name = name;
      user.age = age;
      user.gender = gender;
      user.height = height;
      user.weight = weight;
      user.normalHeartRate = normalHeartRate;
      user.normalBP = normalBP;
      user.normalSpO2 = normalSpO2;
      user.healthConditions = healthConditions || []; // Changed
      user.medications = medications || []; // Changed
      user.caregivers = caregivers;
      user.onboardingCompleted = true;
    } else {
      // Create new user
      user = new User({
        userId,
        name,
        age,
        gender,
        height,
        weight,
        normalHeartRate,
        normalBP,
        normalSpO2,
        healthConditions: healthConditions || [], // Changed
        medications: medications || [], // Changed
        caregivers: caregivers,
        onboardingCompleted: true,
      });
    }

    await user.save();

    return res.status(200).json({
      message: "User information saved successfully",
      user: {
        id: user._id,
        name: user.name,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Error saving user data:", error);
    return res.status(500).json({ message: "Failed to save user data" });
  }
});

router.put("/caregivers", async (req, res) => {
  try {
    const { userId, caregivers } = req.body;

    // Basic validation
    if (!userId || !caregivers || !caregivers.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if caregivers are properly formatted
    const validCaregivers = caregivers.filter(
      (caregiver) => caregiver.name && caregiver.email
    );

    if (validCaregivers.length === 0) {
      return res.status(400).json({
        message: "At least one caregiver with name and email is required",
      });
    }

    // Find the user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update caregivers
    user.caregivers = caregivers;
    await user.save();

    return res.status(200).json({
      message: "Caregivers updated successfully",
      caregivers: user.caregivers,
    });
  } catch (error) {
    console.error("Error updating caregivers:", error);
    return res.status(500).json({ message: "Failed to update caregivers" });
  }
});

// Update user medications
router.put("/medications", async (req, res) => {
  try {
    const { userId, medications } = req.body;

    // Basic validation
    if (!userId || !Array.isArray(medications)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Validate each medication
    for (const med of medications) {
      if (
        !med.name ||
        !med.dosage ||
        !med.frequency ||
        !med.timing ||
        med.timing.length === 0
      ) {
        return res.status(400).json({
          message:
            "Each medication must have name, dosage, frequency, and at least one timing",
        });
      }
    }

    // Find the user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update medications
    user.medications = medications;
    await user.save();

    return res.status(200).json({
      message: "Medications updated successfully",
      medications: user.medications,
    });
  } catch (error) {
    console.error("Error updating medications:", error);
    return res.status(500).json({ message: "Failed to update medications" });
  }
});

// Get user profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        onboardingRequired: true,
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        normalHeartRate: user.normalHeartRate,
        normalBP: user.normalBP,
        normalSpO2: user.normalSpO2,
        healthConditions: user.healthConditions, // Changed
        medications: user.medications, // Changed
        caregivers: user.caregivers || [],
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
