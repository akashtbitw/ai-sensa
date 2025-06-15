// server/routes/simulation.js
const express = require("express");
const router = express.Router();
const {
  simulatePersonalizedHeartRate,
  simulatePersonalizedBloodPressure,
  simulatePersonalizedSpO2,
  simulateFallDetection,
  stopSimulation,
} = require("../utils/vitalSignsSimulator");

const HeartRate = require("../models/HeartRate");
const BloodPressure = require("../models/BloodPressure");
const SpO2 = require("../models/SpO2");
const FallDetection = require("../models/FallDetection");

// Store active simulations for each user
// Format: { userId: { simulationType: intervalObject } }
const activeSimulations = new Map();

// Start a simulation
router.post("/start", async (req, res) => {
  try {
    const { userId, simulationType } = req.body;

    if (!userId || !simulationType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate simulation type
    const validSimulationTypes = [
      "heartRate",
      "bloodPressure",
      "spo2",
      "fallDetection",
    ];
    if (!validSimulationTypes.includes(simulationType)) {
      return res.status(400).json({ message: "Invalid simulation type" });
    }

    // Create user entry if it doesn't exist
    if (!activeSimulations.has(userId)) {
      activeSimulations.set(userId, {});
    }

    const userSimulations = activeSimulations.get(userId);

    // Check if this type of simulation is already running for this user
    if (userSimulations[simulationType]) {
      return res.status(400).json({
        message: `${simulationType} simulation already running for this user`,
      });
    }

    // Start the appropriate simulation based on type
    let simulationInterval;

    if (simulationType === "heartRate") {
      const { variance = 10, interval = 5000 } = req.body;
      simulationInterval = await simulatePersonalizedHeartRate(
        userId,
        variance,
        interval
      );
    } else if (simulationType === "bloodPressure") {
      const { variance = 10, interval = 10000 } = req.body;

      simulationInterval = await simulatePersonalizedBloodPressure(
        userId,
        variance,
        interval
      );
    } else if (simulationType === "spo2") {
      const { variance = 2, interval = 15000 } = req.body;
      simulationInterval = await simulatePersonalizedSpO2(
        userId,
        variance,
        interval
      );
    } else if (simulationType === "fallDetection") {
      const { probability = 5, interval = 60000 } = req.body;
      simulationInterval = simulateFallDetection(userId, probability, interval);
    }

    // Store the simulation reference
    userSimulations[simulationType] = simulationInterval;

    res.status(200).json({
      message: `${simulationType} simulation started successfully`,
      simulationType,
    });
  } catch (err) {
    console.error("Error starting simulation:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Stop a simulation
router.post("/stop", async (req, res) => {
  try {
    const { userId, simulationType } = req.body;

    if (!userId || !simulationType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user has any simulations
    if (!activeSimulations.has(userId)) {
      return res
        .status(404)
        .json({ message: "No active simulations found for this user" });
    }

    const userSimulations = activeSimulations.get(userId);

    // Check if specific simulation type exists
    if (!userSimulations[simulationType]) {
      return res.status(404).json({
        message: `No active ${simulationType} simulation found for this user`,
      });
    }

    // Get the simulation interval
    const simulationInterval = userSimulations[simulationType];

    // Stop the simulation
    stopSimulation(simulationInterval);

    // Remove from active simulations
    delete userSimulations[simulationType];

    // Clean up if no more simulations for this user
    if (Object.keys(userSimulations).length === 0) {
      activeSimulations.delete(userId);
    }

    res.status(200).json({
      message: `${simulationType} simulation stopped successfully`,
      simulationType,
    });
  } catch (err) {
    console.error("Error stopping simulation:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get active simulations for a user
router.get("/active/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Default response for no active simulations
    const defaultResponse = {
      activeSimulations: {
        heartRate: false,
        bloodPressure: false,
        spo2: false,
        fallDetection: false,
      },
    };

    // Check if user has any simulations
    if (!activeSimulations.has(userId)) {
      return res.status(200).json(defaultResponse);
    }

    const userSimulations = activeSimulations.get(userId);

    if (Object.keys(userSimulations).length === 0) {
      return res.status(200).json(defaultResponse);
    }

    // Build response object for simulation status
    const simulationStatus = {
      heartRate: !!userSimulations.heartRate,
      bloodPressure: !!userSimulations.bloodPressure,
      spo2: !!userSimulations.spo2,
      fallDetection: !!userSimulations.fallDetection,
    };

    res.status(200).json({
      activeSimulations: simulationStatus,
    });
  } catch (err) {
    console.error("Error fetching active simulations:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete all data for a specific simulation type for a user
router.delete("/data/:userId/:simulationType", async (req, res) => {
  try {
    const { userId, simulationType } = req.params;

    if (!userId || !simulationType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate simulation type
    const validSimulationTypes = [
      "heart-rate",
      "blood-pressure",
      "spo2",
      "fall-detection",
    ];
    if (!validSimulationTypes.includes(simulationType)) {
      return res.status(400).json({ message: "Invalid simulation type" });
    }

    // Delete data based on simulation type
    let deleteCount = 0;

    if (simulationType === "heart-rate") {
      const result = await HeartRate.deleteMany({ userId });
      deleteCount = result.deletedCount;
    } else if (simulationType === "blood-pressure") {
      const result = await BloodPressure.deleteMany({ userId });
      deleteCount = result.deletedCount;
    } else if (simulationType === "spo2") {
      const result = await SpO2.deleteMany({ userId });
      deleteCount = result.deletedCount;
    } else if (simulationType === "fall-detection") {
      const result = await FallDetection.deleteMany({ userId });
      deleteCount = result.deletedCount;
    }

    res.status(200).json({
      message: `Successfully deleted ${deleteCount} ${simulationType} records for user`,
      deletedCount: deleteCount,
      simulationType,
    });
  } catch (err) {
    console.error(`Error deleting ${req.params.simulationType} data:`, err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
