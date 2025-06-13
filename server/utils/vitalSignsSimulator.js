// server/utils/vitalSignsSimulator.js
const HeartRate = require("../models/HeartRate");
const BloodPressure = require("../models/BloodPressure");
const SpO2 = require("../models/SpO2");
const FallDetection = require("../models/FallDetection");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const User = require("../models/User");
dotenv.config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // or another service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Critical thresholds based on medical guidelines
const THRESHOLDS = {
  HEART_RATE: {
    LOW: 50, // Below this is bradycardia
    HIGH: 100, // Above this is tachycardia
  },
  BLOOD_PRESSURE: {
    SYSTOLIC_HIGH: 140, // Stage 2 hypertension starts at 140 mmHg
    SYSTOLIC_LOW: 90, // Hypotension below 90 mmHg
    DIASTOLIC_HIGH: 90, // Stage 2 hypertension starts at 90 mmHg
    DIASTOLIC_LOW: 60, // Hypotension below 60 mmHg
  },
  SPO2: {
    LOW: 92, // Below this indicates potential hypoxemia
  },
};

// Function to send email alerts
async function sendAlert(userId, vitalSign, value, details = {}) {
  try {
    // Fetch the user document to get caregivers' emails
    const user = await User.findOne({ userId });

    if (!user || !user.caregivers || user.caregivers.length === 0) {
      console.log(`No caregivers found for user ${userId}`);
      return;
    }

    // Extract caregiver emails
    const caregiverEmails = user.caregivers
      .map((caregiver) => caregiver.email)
      .filter((email) => email);

    if (caregiverEmails.length === 0) {
      console.log(`No valid caregiver emails found for user ${userId}`);
      return;
    }

    // Construct email message based on vital sign
    let subject = `ALERT: Critical ${vitalSign} Reading for Patient ${user.name} (ID: ${userId})`;
    let message = `A critical vital sign reading has been detected for ${user.name}:\n\n`;

    switch (vitalSign) {
      case "Heart Rate":
        message += `Heart Rate: ${value} BPM (${
          value < THRESHOLDS.HEART_RATE.LOW ? "Bradycardia" : "Tachycardia"
        })\n`;
        message += `Timestamp: ${new Date().toLocaleString()}\n`;
        break;

      case "Blood Pressure":
        message += `Blood Pressure: ${details.systolic}/${details.diastolic} mmHg\n`;
        if (details.systolic > THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_HIGH) {
          message += `High systolic pressure detected\n`;
        } else if (details.systolic < THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_LOW) {
          message += `Low systolic pressure detected\n`;
        }

        if (details.diastolic > THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_HIGH) {
          message += `High diastolic pressure detected\n`;
        } else if (
          details.diastolic < THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_LOW
        ) {
          message += `Low diastolic pressure detected\n`;
        }
        message += `Timestamp: ${new Date().toLocaleString()}\n`;
        break;

      case "SpO2":
        message += `Blood Oxygen Level: ${value}%\n`;
        message += `This indicates potential hypoxemia and requires immediate attention.\n`;
        message += `Timestamp: ${new Date().toLocaleString()}\n`;
        break;

      case "Fall Detection":
        message += `A high severity fall has been detected!\n`;
        message += `Location: ${details.location}\n`;
        message += `Immediate assistance may be required.\n`;
        message += `Timestamp: ${new Date().toLocaleString()}\n`;
        subject = `URGENT: Fall Detection Alert for Patient ${user.name} (ID: ${userId})`;
        break;
    }

    message += `\nPatient Details:\n`;
    message += `Name: ${user.name}\n`;
    message += `Age: ${user.age}\n`;
    message += `Gender: ${user.gender}\n`;

    if (user.disease) {
      message += `Medical Condition: ${user.disease}\n`;
    }

    if (user.medications) {
      message += `Medications: ${user.medications}\n`;
    }

    message +=
      "\nThis is an automated message from AI Sensa Health Monitoring System.";

    // Send the email to all caregivers
    for (const email of caregiverEmails) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: subject,
          text: message,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Alert email sent to ${email}: ${info.messageId}`);
      } catch (emailErr) {
        // If sending to one caregiver fails, continue with others
        console.error(`Error sending email to ${email}:`, emailErr);
      }
    }
  } catch (err) {
    console.error("Error sending email alert:", err);
  }
}

// Function to add notification to user's database
async function addNotificationToUser(userId, title, body, type) {
  try {
    const user = await User.findOne({ userId });
    if (user) {
      await user.addNotification(title, body, type);
      console.log(`Added ${type} notification for user ${userId}`);
    } else {
      console.log(`User ${userId} not found for notification`);
    }
  } catch (err) {
    console.error("Error adding notification to user:", err);
  }
}

function simulateHeartRate(
  userId,
  baseHeartRate = 75,
  variance = 10,
  interval = 5000
) {
  console.log("Starting heart rate simulation");

  // Function to generate a random heart rate
  const generateHeartRate = () => {
    // Generate a random value between -variance and +variance
    const randomVariation = Math.random() * (variance * 2) - variance;

    // Add the random variation to the base heart rate
    let heartRate = Math.round(baseHeartRate + randomVariation);

    // Ensure heart rate stays within realistic bounds
    heartRate = Math.max(40, Math.min(180, heartRate));

    return heartRate;
  };

  // Function to save a heart rate reading
  const saveHeartRate = async () => {
    try {
      const bpm = generateHeartRate();

      const newReading = new HeartRate({
        userId,
        bpm,
      });

      await newReading.save();
      console.log(`Saved heart rate: ${bpm} BPM`);

      // Check for critical values
      if (bpm < THRESHOLDS.HEART_RATE.LOW || bpm > THRESHOLDS.HEART_RATE.HIGH) {
        console.log(`Critical heart rate detected: ${bpm} BPM`);
        await sendAlert(userId, "Heart Rate", bpm);
      }
    } catch (err) {
      console.error("Error saving simulated heart rate:", err);
    }
  };

  // Start the interval and return it so it can be stopped later
  const simulationInterval = setInterval(saveHeartRate, interval);

  // Save one reading immediately
  saveHeartRate();

  return simulationInterval;
}

function simulateBloodPressure(
  userId,
  baseSystolic = 120,
  baseDiastolic = 80,
  variance = 10,
  interval = 10000
) {
  console.log("Starting blood pressure simulation");

  // Function to generate a random blood pressure reading
  const generateBloodPressure = () => {
    // Generate random variations for systolic and diastolic
    const systolicVariation = Math.random() * (variance * 2) - variance;
    const diastolicVariation =
      Math.random() * (variance * 0.8 * 2) - variance * 0.8;

    // Add the random variations to the base values
    let systolic = Math.round(baseSystolic + systolicVariation);
    let diastolic = Math.round(baseDiastolic + diastolicVariation);

    // Ensure values stay within realistic bounds
    systolic = Math.max(90, Math.min(180, systolic));
    diastolic = Math.max(60, Math.min(120, diastolic));

    // Ensure systolic is always greater than diastolic
    if (systolic <= diastolic) {
      systolic = diastolic + 10 + Math.floor(Math.random() * 10);
    }

    return { systolic, diastolic };
  };

  // Function to save a blood pressure reading
  const saveBloodPressure = async () => {
    try {
      const { systolic, diastolic } = generateBloodPressure();

      const newReading = new BloodPressure({
        userId,
        systolic,
        diastolic,
      });

      await newReading.save();
      console.log(`Saved BP: ${systolic}/${diastolic} mmHg`);

      // Check for critical values
      const isCritical =
        systolic > THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_HIGH ||
        systolic < THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_LOW ||
        diastolic > THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_HIGH ||
        diastolic < THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_LOW;

      if (isCritical) {
        console.log(
          `Critical blood pressure detected: ${systolic}/${diastolic} mmHg`
        );
        await sendAlert(userId, "Blood Pressure", null, {
          systolic,
          diastolic,
        });
      }
    } catch (err) {
      console.error("Error saving simulated blood pressure:", err);
    }
  };

  // Start the interval and return it so it can be stopped later
  const simulationInterval = setInterval(saveBloodPressure, interval);

  // Save one reading immediately
  saveBloodPressure();

  return simulationInterval;
}

function simulateSpO2(userId, baseLevel = 97, variance = 2, interval = 15000) {
  console.log("Starting SpO2 simulation");

  // Function to generate a random SpO2 reading
  const generateSpO2 = () => {
    // Generate a random value between -variance and +variance
    const randomVariation = Math.random() * (variance * 2) - variance;

    // Add the random variation to the base level
    let level = Math.round(baseLevel + randomVariation);

    // Ensure level stays within realistic bounds
    level = Math.max(85, Math.min(100, level));

    return level;
  };

  // Function to save a SpO2 reading
  const saveSpO2 = async () => {
    try {
      const level = generateSpO2();

      const newReading = new SpO2({
        userId,
        level,
      });

      await newReading.save();
      console.log(`Saved SpO2: ${level}%`);

      // Check for critical values
      if (level < THRESHOLDS.SPO2.LOW) {
        console.log(`Critical SpO2 level detected: ${level}%`);
        await sendAlert(userId, "SpO2", level);
      }
    } catch (err) {
      console.error("Error saving simulated SpO2:", err);
    }
  };

  // Start the interval and return it so it can be stopped later
  const simulationInterval = setInterval(saveSpO2, interval);

  // Save one reading immediately
  saveSpO2();

  return simulationInterval;
}

function simulateFallDetection(userId, probability = 5, interval = 60000) {
  console.log("Starting fall detection simulation");

  // Possible fall locations
  const locations = [
    "Bedroom",
    "Bathroom",
    "Kitchen",
    "Living Room",
    "Hallway",
    "Stairs",
    "Garden",
  ];

  // Fall severities with their probabilities
  const severities = [
    { type: "low", probability: 60 },
    { type: "medium", probability: 30 },
    { type: "high", probability: 10 },
  ];

  // Function to check for a fall
  const checkForFall = async () => {
    try {
      // Random number between 1-100
      const fallChance = Math.random() * 100;

      console.log(
        `Fall check: chance ${fallChance.toFixed(
          2
        )}%, threshold ${probability}%`
      );

      // If the random number is less than or equal to the fall probability, record a fall
      if (fallChance <= probability) {
        // Select a random location
        const location =
          locations[Math.floor(Math.random() * locations.length)];

        // Select a severity based on weighted probabilities
        let severityRoll = Math.random() * 100;
        let chosenSeverity = "medium"; // Default

        let cumulativeProbability = 0;
        for (const severity of severities) {
          cumulativeProbability += severity.probability;
          if (severityRoll <= cumulativeProbability) {
            chosenSeverity = severity.type;
            break;
          }
        }

        const newFall = new FallDetection({
          userId,
          severity: chosenSeverity,
          location,
        });

        await newFall.save();
        console.log(`Recorded fall: ${chosenSeverity} severity in ${location}`);

        // Add emergency_alert notification for all falls
        const notificationTitle = `Fall Detected - ${
          chosenSeverity.charAt(0).toUpperCase() + chosenSeverity.slice(1)
        } Severity`;
        const notificationBody = `A ${chosenSeverity} severity fall has been detected in the ${location}. ${
          chosenSeverity === "high"
            ? "Immediate assistance may be required."
            : "Please check on the patient."
        }`;

        await addNotificationToUser(
          userId,
          notificationTitle,
          notificationBody,
          "emergency_alert"
        );

        // Send alert only for high severity falls
        if (chosenSeverity === "high") {
          console.log(
            `High severity fall detected in ${location} - sending alert`
          );
          await sendAlert(userId, "Fall Detection", null, {
            severity: chosenSeverity,
            location,
          });
        }
      } else {
        console.log("No fall detected");
      }
    } catch (err) {
      console.error("Error in fall detection simulation:", err);
    }
  };

  // Start the interval and return it so it can be stopped later
  const simulationInterval = setInterval(checkForFall, interval);

  // Run an immediate check when starting the simulation
  checkForFall();

  return simulationInterval;
}

function stopSimulation(intervalObject) {
  clearInterval(intervalObject);
  console.log("Simulation stopped");
}

module.exports = {
  simulateHeartRate,
  simulateBloodPressure,
  simulateSpO2,
  simulateFallDetection,
  stopSimulation,
};
