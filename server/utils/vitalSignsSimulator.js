// server/utils/vitalSignsSimulator.js
const MarkdownIt = require("markdown-it");
const HeartRate = require("../models/HeartRate");
const BloodPressure = require("../models/BloodPressure");
const SpO2 = require("../models/SpO2");
const FallDetection = require("../models/FallDetection");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const User = require("../models/User");
dotenv.config();
const criticalAlertsBuffer = new Map();
const BUFFER_DELAY = 30000;

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
function formatContent(text) {
  // Configure markdown-it for your specific needs
  const md = new MarkdownIt({
    html: true, // Allow HTML tags in source
    breaks: true, // Convert '\n' in paragraphs into <br>
    linkify: false, // Don't auto-convert URLs (not needed for medical text)
    typographer: false, // Don't do smart quotes/dashes (keep medical text as-is)
  });

  // Custom renderer for strong tags to handle both ** and ***
  md.renderer.rules.strong_open = () => "<strong>";
  md.renderer.rules.strong_close = () => "</strong>";

  // Custom renderer to add better spacing
  md.renderer.rules.paragraph_open = () => {
    return '<p style="margin-bottom: 16px; line-height: 1.6;">';
  };

  // Add spacing to lists
  md.renderer.rules.bullet_list_open = () => {
    return '<ul style="margin: 12px 0; padding-left: 24px;">';
  };

  // Add spacing to list items
  md.renderer.rules.list_item_open = () => {
    return '<li style="margin-bottom: 8px; line-height: 1.5;">';
  };

  // Process the text
  let htmlText = md.render(text);

  // Add extra spacing around major sections
  htmlText = htmlText.replace(
    /<p style="margin-bottom: 16px; line-height: 1.6;"><strong>([^<]+)<\/strong><\/p>/g,
    '<div style="margin: 24px 0 16px 0;"><h3 style="margin: 0; font-weight: bold; font-size: 1.1em; color: #2c3e50;">$1</h3></div>'
  );

  // For plain text, strip HTML tags and add proper spacing
  const plainText = htmlText
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Normalize multiple line breaks
    .trim();

  return {
    plainText: plainText,
    htmlText: htmlText.trim(),
  };
}

// Function to parse normal BP string to numeric values
function parseNormalBP(normalBP) {
  const [systolic, diastolic] = normalBP.split("/").map(Number);
  return { systolic, diastolic };
}

// Function to determine if vital signs are critical based on user's normal values
function isVitalCritical(vitalType, currentValue, userData, details = {}) {
  switch (vitalType) {
    case "Heart Rate":
      const normalHR = userData.normalHeartRate;
      const hrDeviation = Math.abs(currentValue - normalHR);
      const hrDeviationPercent = (hrDeviation / normalHR) * 100;

      // Critical if more than 30% deviation from normal OR beyond medical thresholds
      return (
        hrDeviationPercent > 30 ||
        currentValue < THRESHOLDS.HEART_RATE.LOW ||
        currentValue > THRESHOLDS.HEART_RATE.HIGH
      );

    case "Blood Pressure":
      const { systolic: normalSys, diastolic: normalDia } = parseNormalBP(
        userData.normalBP
      );
      const sysDeviation = Math.abs(details.systolic - normalSys);
      const diaDeviation = Math.abs(details.diastolic - normalDia);

      // Critical if significant deviation from normal OR beyond medical thresholds
      return (
        sysDeviation > 20 ||
        diaDeviation > 15 ||
        details.systolic > THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_HIGH ||
        details.systolic < THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_LOW ||
        details.diastolic > THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_HIGH ||
        details.diastolic < THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_LOW
      );

    case "SpO2":
      const normalSpO2 = userData.normalSpO2;
      const o2Deviation = normalSpO2 - currentValue;

      // Critical if 3% or more below normal OR below medical threshold
      return o2Deviation >= 3 || currentValue < THRESHOLDS.SPO2.LOW;

    default:
      return false;
  }
}
async function generateCombinedContent(userData, alerts) {
  try {
    const { generateCriticalHealthContent } = require("./geminiAI");

    // Use the new critical health content generator
    const aiContent = await generateCriticalHealthContent(userData, alerts);

    // Create combined subject
    const alertTypes = alerts.map((alert) => alert.vitalSign).join(", ");
    const combinedTitle =
      alerts.length > 1
        ? `CRITICAL: Multiple Health Alerts`
        : `CRITICAL: ${alerts[0].vitalSign} Alert`;
    const combinedSubject =
      alerts.length > 1
        ? `⚠️ CRITICAL: Multiple Health Alerts - ${userData.name}`
        : `⚠️ CRITICAL: ${alerts[0].vitalSign} Alert - ${userData.name}`;

    return {
      title: combinedTitle,
      subject: combinedSubject,
      body: aiContent.body,
    };
  } catch (error) {
    console.error("Error generating combined AI content:", error);

    // Fallback content
    const alertTypes = alerts.map((alert) => alert.vitalSign).join(", ");
    return {
      subject: `⚠️ CRITICAL: Health Alert - ${userData.name}`,
      body: `Multiple critical vital signs detected: ${alertTypes}. Immediate medical attention may be required. Please contact the patient and consider medical evaluation.`,
    };
  }
}

async function processCriticalAlertsBuffer(userId) {
  try {
    const buffer = criticalAlertsBuffer.get(userId);
    if (!buffer || buffer.alerts.length === 0) {
      criticalAlertsBuffer.delete(userId);
      return;
    }

    console.log(
      `Processing ${buffer.alerts.length} critical alerts for user ${userId}`
    );

    const user = await User.findOne({ userId });

    if (!user || !user.caregivers || user.caregivers.length === 0) {
      console.log(`No caregivers found for user ${userId}`);
      criticalAlertsBuffer.delete(userId);
      return;
    }

    // Generate AI content for all critical alerts using the new method
    const aiContent = await generateCombinedContent(user, buffer.alerts);

    // Create notification body with basic alert info (no patient details for privacy)
    let notificationBody = "";
    if (buffer.alerts.length > 1) {
      notificationBody += `**Multiple Critical Event Details:**\n`;
      buffer.alerts.forEach((alert) => {
        if (alert.vitalSign === "Heart Rate") {
          notificationBody += `• Heart Rate: ${alert.value} BPM\n`;
        } else if (alert.vitalSign === "Blood Pressure") {
          notificationBody += `• Blood Pressure: ${alert.details.systolic}/${alert.details.diastolic} mmHg\n`;
        } else if (alert.vitalSign === "SpO2") {
          notificationBody += `• Blood Oxygen: ${alert.value}%\n\n`;
        }
      });
    } else {
      notificationBody += `**Critical Event Details:**\n`;
      const alert = buffer.alerts[0];
      if (alert.vitalSign === "Heart Rate") {
        notificationBody += `• Heart Rate: ${alert.value} BPM\n`;
      } else if (alert.vitalSign === "Blood Pressure") {
        notificationBody += `• Blood Pressure: ${alert.details.systolic}/${alert.details.diastolic} mmHg\n`;
      } else if (alert.vitalSign === "SpO2") {
        notificationBody += `• Blood Oxygen: ${alert.value}%\n\n`;
      }
    }

    // Add AI-generated medical guidance to notification
    notificationBody += `\n\n${aiContent.body}`;

    try {
      await user.addNotification(
        aiContent.title,
        notificationBody,
        "critical_health_condition"
      );
      console.log(
        `Added critical health notification with AI guidance for user ${userId}`
      );
    } catch (err) {
      console.error("Error adding notification to user:", err);
    }

    // Send combined email with full patient details
    const caregiverEmails = user.caregivers
      .map((caregiver) => caregiver.email)
      .filter((email) => email);

    if (caregiverEmails.length > 0) {
      // Format email body with patient details
      const timestamp = new Date().toLocaleString();
      let emailBody = `Dear Caregiver,\n\n`;

      // Add critical event details
      emailBody += `**Critical Health Event Details:**\n`;

      buffer.alerts.forEach((alert, index) => {
        if (buffer.alerts.length > 1) {
          emailBody += `\nAlert ${index + 1}: ${alert.vitalSign}\n`;
        } else {
          emailBody += `\nAlert: ${alert.vitalSign}\n`;
        }
        if (alert.vitalSign === "Heart Rate") {
          emailBody += `• Current Reading: ${alert.value} BPM\n`;
          emailBody += `• Normal Range: ${user.normalHeartRate} BPM\n`;
        } else if (alert.vitalSign === "Blood Pressure") {
          emailBody += `• Current Reading: ${alert.details.systolic}/${alert.details.diastolic} mmHg\n`;
          emailBody += `• Normal Range: ${user.normalBP} mmHg\n`;
        } else if (alert.vitalSign === "SpO2") {
          emailBody += `• Current Reading: ${alert.value}%\n`;
          emailBody += `• Normal Range: ${user.normalSpO2}%\n`;
        }
      });

      emailBody += `\n**Patient Details:**\n`;
      emailBody += `• Name: ${user.name}\n`;
      emailBody += `• Age: ${user.age}\n`;
      emailBody += `• Gender: ${user.gender}\n`;
      if (user.healthConditions && user.healthConditions.length > 0) {
        emailBody += `• Health Conditions: ${user.healthConditions.join(
          ", "
        )}\n`;
      }
      if (user.medications && user.medications.length > 0) {
        emailBody += `• Current Medications: ${user.medications
          .map((med) => `${med.name} (${med.dosage})`)
          .join(", ")}\n`;
      }

      emailBody += `\n${aiContent.body}\n\n`;
      emailBody += `---\n<i>This is an AI generated alert from AI Sensa Health Monitoring System.</i>\n<i>For support, contact: support-aisensa@gmail.com</i>\n\n<i>Alert Generated: ${timestamp}</i>`;

      for (const email of caregiverEmails) {
        try {
          const { plainText, htmlText } = formatContent(emailBody);
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: aiContent.subject,
            text: plainText,
            html: htmlText,
          };

          const info = await transporter.sendMail(mailOptions);
          console.log(
            `Critical health alert email sent to ${email}: ${info.messageId}`
          );
        } catch (emailErr) {
          console.error(`Error sending email to ${email}:`, emailErr);
        }
      }
    }

    // Clear the buffer
    criticalAlertsBuffer.delete(userId);
    console.log(`Processed and cleared buffer for user ${userId}`);
  } catch (err) {
    console.error("Error processing critical alerts buffer:", err);
    criticalAlertsBuffer.delete(userId);
  }
}

// Enhanced alert function with AI-generated content
async function sendEnhancedAlert(
  userId,
  vitalSign,
  value,
  details = {},
  notiType = "critical_health_condition"
) {
  try {
    if (notiType === "emergency_alert") {
      // Send fall detection alerts immediately
      const { generateEmergencyFallContent } = require("./geminiAI");
      const user = await User.findOne({ userId });

      if (!user || !user.caregivers || user.caregivers.length === 0) {
        console.log(`No caregivers found for user ${userId}`);
        return;
      }

      const aiContent = await generateEmergencyFallContent(user, details);

      // Fixed format for emergency alerts
      const subject = `🚨 EMERGENCY: Fall Detection Alert - ${user.name}`;
      const title = "EMERGENCY: Fall Detection Alert";

      // Create structured email body for fall detection
      const timestamp = new Date().toLocaleString();
      let emailBody = `Dear Caregiver,\n\n`;
      emailBody += `**Emergency Event Details:**\n`;
      emailBody += `• Type: Fall\n`;
      emailBody += `• Severity: ${
        details.severity.charAt(0).toUpperCase() + details.severity.slice(1)
      }\n`;
      emailBody += `• Location: ${details.location}\n\n`;
      emailBody += `**Patient Details:**\n`;
      emailBody += `• Name: ${user.name}\n`;
      emailBody += `• Age: ${user.age}\n`;
      emailBody += `• Gender: ${user.gender}\n`;
      if (user.healthConditions && user.healthConditions.length > 0) {
        emailBody += `• Known Health Conditions: ${user.healthConditions.join(
          ", "
        )}\n`;
      }
      if (user.medications && user.medications.length > 0) {
        emailBody += `• Medications: ${user.medications
          .map((med) => `${med.name} (${med.dosage})`)
          .join(", ")}\n`;
      }
      emailBody += `\n${aiContent.body}\n\n`;
      emailBody += `---\n<i>This is an AI generated alert from AI Sensa Health Monitoring System.</i>\n<i>For support, contact: support-aisensa@gmail.com</i>\n\n<i>Alert Generated: ${timestamp}</i>`;

      // Add notification to database with AI generated content
      try {
        let notificationBody = "";
        notificationBody += `**Emergency Event Details:**\n`;
        notificationBody += `• Type: Fall\n`;
        notificationBody += `• Severity: ${
          details.severity.charAt(0).toUpperCase() + details.severity.slice(1)
        }\n`;
        notificationBody += `• Location: ${details.location}\n\n`;
        notificationBody += `${aiContent.body}\n\n`;
        await user.addNotification(title, notificationBody, "emergency_alert");
        console.log(`Added emergency notification for user ${userId}`);
      } catch (err) {
        console.error("Error adding emergency notification to user:", err);
      }

      // Send email immediately for emergency
      const caregiverEmails = user.caregivers
        .map((caregiver) => caregiver.email)
        .filter((email) => email);

      if (caregiverEmails.length > 0) {
        for (const email of caregiverEmails) {
          try {
            const { plainText, htmlText } = formatContent(emailBody);
            const mailOptions = {
              from: process.env.EMAIL_USER,
              to: email,
              subject: subject,
              text: plainText,
              html: htmlText,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(
              `Emergency alert email sent to ${email}: ${info.messageId}`
            );
          } catch (emailErr) {
            console.error(
              `Error sending emergency email to ${email}:`,
              emailErr
            );
          }
        }
      }
    } else {
      // Handle critical_health_condition alerts with buffering
      const alertData = {
        vitalSign,
        value,
        details,
        timestamp: new Date(),
      };

      if (criticalAlertsBuffer.has(userId)) {
        // Check if this vital sign type is already in the buffer
        const buffer = criticalAlertsBuffer.get(userId);
        const existingAlert = buffer.alerts.find(
          (alert) => alert.vitalSign === vitalSign
        );

        if (existingAlert) {
          // IGNORE if this vital sign type is already in the buffer
          console.log(
            `${vitalSign} alert already exists in buffer for user ${userId} - ignoring duplicate`
          );
          return; // Exit without adding or updating
        } else {
          // Add new vital type to existing buffer
          buffer.alerts.push(alertData);
          console.log(
            `Added ${vitalSign} to existing buffer for user ${userId}`
          );
        }
      } else {
        // Create new buffer
        const buffer = {
          alerts: [alertData],
          timeout: setTimeout(() => {
            processCriticalAlertsBuffer(userId);
          }, BUFFER_DELAY),
        };
        criticalAlertsBuffer.set(userId, buffer);
        console.log(`Created new buffer for user ${userId} with ${vitalSign}`);
      }
    }
  } catch (err) {
    console.error("Error in sendEnhancedAlert:", err);
  }
}

// Function to generate more realistic vital signs based on user's health conditions
function adjustVitalSignsForConditions(baseValue, userData, vitalType) {
  const conditions = userData.healthConditions || [];
  const medications = userData.medications || [];

  let adjustedValue = baseValue;

  // Adjust based on health conditions
  conditions.forEach((condition) => {
    const lowerCondition = condition.toLowerCase();

    if (vitalType === "Heart Rate") {
      if (
        lowerCondition.includes("hypertension") ||
        lowerCondition.includes("high blood pressure")
      ) {
        adjustedValue += Math.random() * 10 + 5; // Slightly elevated
      }
      if (lowerCondition.includes("diabetes")) {
        adjustedValue += Math.random() * 8 + 3;
      }
      if (
        lowerCondition.includes("heart") ||
        lowerCondition.includes("cardiac")
      ) {
        adjustedValue += Math.random() * 15 + 10; // More significant elevation
      }
    } else if (vitalType === "Blood Pressure") {
      if (
        lowerCondition.includes("hypertension") ||
        lowerCondition.includes("high blood pressure")
      ) {
        adjustedValue += Math.random() * 20 + 10;
      }
      if (lowerCondition.includes("diabetes")) {
        adjustedValue += Math.random() * 15 + 5;
      }
    } else if (vitalType === "SpO2") {
      if (
        lowerCondition.includes("copd") ||
        lowerCondition.includes("asthma") ||
        lowerCondition.includes("lung")
      ) {
        adjustedValue -= Math.random() * 3 + 1; // Lower oxygen levels
      }
      if (
        lowerCondition.includes("heart") ||
        lowerCondition.includes("cardiac")
      ) {
        adjustedValue -= Math.random() * 2 + 1;
      }
    }
  });

  // Adjust based on age
  if (userData.age > 65) {
    if (vitalType === "Heart Rate") {
      adjustedValue += Math.random() * 5 + 2;
    } else if (vitalType === "SpO2") {
      adjustedValue -= Math.random() * 1 + 0.5;
    }
  }

  return adjustedValue;
}

async function simulatePersonalizedHeartRate(
  userId,
  variance = 10,
  interval = 5000
) {
  console.log("Starting personalized heart rate simulation");

  // Fetch user data
  const user = await User.findOne({ userId });
  if (!user) {
    console.error(`User ${userId} not found for heart rate simulation`);
    return null;
  }

  const baseHeartRate = user.normalHeartRate;

  const generatePersonalizedHeartRate = () => {
    const randomVariation = Math.random() * (variance * 2) - variance;
    let heartRate = Math.round(baseHeartRate + randomVariation);

    // Apply health condition adjustments
    heartRate = adjustVitalSignsForConditions(heartRate, user, "Heart Rate");

    heartRate = Math.round(heartRate);

    // Ensure realistic bounds
    heartRate = Math.max(40, Math.min(180, heartRate));

    return heartRate;
  };

  const savePersonalizedHeartRate = async () => {
    try {
      const bpm = generatePersonalizedHeartRate();

      const newReading = new HeartRate({
        userId,
        bpm,
      });

      await newReading.save();
      console.log(
        `Saved personalized heart rate: ${bpm} BPM (Normal: ${baseHeartRate} BPM)`
      );

      // Check for critical values using personalized thresholds
      const updatedUser = await User.findOne({ userId });
      if (isVitalCritical("Heart Rate", bpm, updatedUser)) {
        console.log(`Critical heart rate detected: ${bpm} BPM`);
        await sendEnhancedAlert(
          userId,
          "Heart Rate",
          bpm,
          {},
          "critical_health_condition"
        );
      }
    } catch (err) {
      console.error("Error saving personalized heart rate:", err);
    }
  };

  const simulationInterval = setInterval(savePersonalizedHeartRate, interval);
  savePersonalizedHeartRate();

  return simulationInterval;
}

async function simulatePersonalizedBloodPressure(
  userId,
  variance = 10,
  interval = 10000
) {
  console.log("Starting personalized blood pressure simulation");

  // Fetch user data
  const user = await User.findOne({ userId });
  if (!user) {
    console.error(`User ${userId} not found for blood pressure simulation`);
    return null;
  }

  const { systolic: baseSystolic, diastolic: baseDiastolic } = parseNormalBP(
    user.normalBP
  );

  const generatePersonalizedBloodPressure = () => {
    const systolicVariation = Math.random() * (variance * 2) - variance;
    const diastolicVariation =
      Math.random() * (variance * 0.8 * 2) - variance * 0.8;

    let systolic = Math.round(baseSystolic + systolicVariation);
    let diastolic = Math.round(baseDiastolic + diastolicVariation);

    // Apply health condition adjustments
    systolic = adjustVitalSignsForConditions(systolic, user, "Blood Pressure");
    diastolic = adjustVitalSignsForConditions(
      diastolic,
      user,
      "Blood Pressure"
    );

    systolic = Math.round(systolic);
    diastolic = Math.round(diastolic);

    // Ensure realistic bounds
    systolic = Math.max(90, Math.min(200, systolic));
    diastolic = Math.max(50, Math.min(120, diastolic));

    // Ensure systolic is always greater than diastolic
    if (systolic <= diastolic) {
      systolic = diastolic + 10 + Math.floor(Math.random() * 10);
    }

    return { systolic, diastolic };
  };

  const savePersonalizedBloodPressure = async () => {
    try {
      const { systolic, diastolic } = generatePersonalizedBloodPressure();

      const newReading = new BloodPressure({
        userId,
        systolic,
        diastolic,
      });

      await newReading.save();
      console.log(
        `Saved personalized BP: ${systolic}/${diastolic} mmHg (Normal: ${user.normalBP})`
      );

      // Check for critical values using personalized thresholds
      const updatedUser = await User.findOne({ userId });
      if (
        isVitalCritical("Blood Pressure", null, updatedUser, {
          systolic,
          diastolic,
        })
      ) {
        console.log(
          `Critical blood pressure detected: ${systolic}/${diastolic} mmHg`
        );
        await sendEnhancedAlert(
          userId,
          "Blood Pressure",
          null,
          { systolic, diastolic },
          "critical_health_condition"
        );
      }
    } catch (err) {
      console.error("Error saving personalized blood pressure:", err);
    }
  };

  const simulationInterval = setInterval(
    savePersonalizedBloodPressure,
    interval
  );
  savePersonalizedBloodPressure();

  return simulationInterval;
}

async function simulatePersonalizedSpO2(
  userId,
  variance = 2,
  interval = 15000
) {
  console.log("Starting personalized SpO2 simulation");

  // Fetch user data
  const user = await User.findOne({ userId });
  if (!user) {
    console.error(`User ${userId} not found for SpO2 simulation`);
    return null;
  }

  const baseLevel = user.normalSpO2;

  const generatePersonalizedSpO2 = () => {
    const randomVariation = Math.random() * (variance * 2) - variance;
    let level = Math.round(baseLevel + randomVariation);

    // Apply health condition adjustments
    level = adjustVitalSignsForConditions(level, user, "SpO2");

    level = Math.round(level);
    // Ensure realistic bounds
    level = Math.max(85, Math.min(100, level));

    return level;
  };

  const savePersonalizedSpO2 = async () => {
    try {
      const level = generatePersonalizedSpO2();

      const newReading = new SpO2({
        userId,
        level,
      });

      await newReading.save();
      console.log(`Saved personalized SpO2: ${level}% (Normal: ${baseLevel}%)`);

      // Check for critical values using personalized thresholds
      const updatedUser = await User.findOne({ userId });
      if (isVitalCritical("SpO2", level, updatedUser)) {
        console.log(`Critical SpO2 level detected: ${level}%`);
        await sendEnhancedAlert(
          userId,
          "SpO2",
          level,
          {},
          "critical_health_condition"
        );
      }
    } catch (err) {
      console.error("Error saving personalized SpO2:", err);
    }
  };

  const simulationInterval = setInterval(savePersonalizedSpO2, interval);
  savePersonalizedSpO2();

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
      const fallChance = Math.random() * 100;
      console.log(
        `Fall check: chance ${fallChance.toFixed(
          2
        )}%, threshold ${probability}%`
      );

      if (fallChance <= probability) {
        const location =
          locations[Math.floor(Math.random() * locations.length)];

        let severityRoll = Math.random() * 100;
        let chosenSeverity = "medium";

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

        // Send emergency alert for all falls with AI content
        console.log(`Fall detected in ${location} - sending emergency alert`);
        await sendEnhancedAlert(
          userId,
          "Fall",
          null,
          { severity: chosenSeverity, location },
          "emergency_alert"
        );
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
  simulatePersonalizedHeartRate,
  simulatePersonalizedBloodPressure,
  simulatePersonalizedSpO2,
  simulateFallDetection,
  stopSimulation,
};
