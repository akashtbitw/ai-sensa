// server/utils/geminiAI.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function generateCriticalHealthContent(userData, alerts) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build patient profile section
    let prompt = `PATIENT PROFILE:
- Age: ${userData.age} years
- Gender: ${userData.gender}
- Health Conditions: ${userData.healthConditions?.join(", ") || "None reported"}
- Current Medications: ${
      userData.medications
        ?.map((med) => `${med.name} (${med.dosage})`)
        .join(", ") || "None reported"
    }

BASELINE VITAL SIGNS:
- Normal Heart Rate: ${userData.normalHeartRate} BPM
- Normal Blood Pressure: ${userData.normalBP} mmHg
- Normal SpO2: ${userData.normalSpO2}%

CRITICAL ALERTS DETECTED:
`;

    // Add each alert details
    alerts.forEach((alert, index) => {
      prompt += `\nAlert ${index + 1}: ${alert.vitalSign.toUpperCase()}\n`;

      if (alert.vitalSign === "Heart Rate") {
        const normalHR = userData.normalHeartRate;
        const deviation = Math.abs(alert.value - normalHR);
        const deviationPercent = ((deviation / normalHR) * 100).toFixed(1);

        prompt += `- Current Reading: ${alert.value} BPM
- Patient's Normal Rate: ${normalHR} BPM
- Deviation: ${deviation} BPM (${deviationPercent}% from normal)
- Medical Classification: Decide yourself using current and normal data`;
      } else if (alert.vitalSign === "Blood Pressure") {
        const [normalSys, normalDia] = userData.normalBP.split("/").map(Number);
        const sysDeviation = Math.abs(alert.details.systolic - normalSys);
        const diaDeviation = Math.abs(alert.details.diastolic - normalDia);

        prompt += `- Current Reading: ${alert.details.systolic}/${alert.details.diastolic} mmHg
- Patient's Normal BP: ${userData.normalBP} mmHg
- Systolic Deviation: ${sysDeviation} mmHg
- Diastolic Deviation: ${diaDeviation} mmHg
- Medical Classification: Decide yourself using current and normal data`;
      } else if (alert.vitalSign === "SpO2") {
        const normalSpO2 = userData.normalSpO2;
        const o2Deviation = normalSpO2 - alert.value;

        prompt += `- Current Reading: ${alert.value}%
- Patient's Normal SpO2: ${normalSpO2}%
- Deviation: -${o2Deviation}% below normal
- Medical Classification: Decide yourself using current and normal data`;
      }
    });

    prompt += `

ANALYSIS CONSIDERATIONS:
1. Age-related complications and medication interactions
2. Pre-existing condition impact on current vital sign abnormalities
3. Potential cascading effects between multiple abnormal vital signs
4. Urgency level based on deviation severity and patient risk factors

Generate personalized medical guidance with these sections (max 600 words):

IMMEDIATE PRIORITY ACTIONS
- Severity-specific response recommendations for each detected abnormality
- Critical symptoms requiring emergency services
- Vital sign monitoring and stabilization steps

PERSONALIZED RISK ASSESSMENT
- Patient-specific complications(include this part if any healthConditions is present) to monitor
- Medication interaction warnings(include this part if any current medication is present)
- Age and condition-based observation requirements
- Potential complications from multiple abnormal vital signs

FOLLOW-UP CARE RECOMMENDATIONS
- When to contact primary physician vs emergency services
- Symptoms requiring urgent medical evaluation
- Recovery monitoring based on patient's specific risk profile
- Timeline for re-assessment of vital signs

Provide clear, actionable medical guidance using the patient's specific risk factors and current vital sign abnormalities. Include specific timeframes for actions. Do not include any headers, formalities, or introductory text - deliver direct medical content only. Use proper formatting for headers, bullet points, and bold text for emphasis and readability.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    return {
      body: text,
    };
  } catch (error) {
    console.error("Error generating critical health AI content:", error);

    // Fallback content
    const alertTypes = alerts.map((alert) => alert.vitalSign).join(", ");
    return {
      body: `Critical vital signs detected: ${alertTypes}. Multiple abnormal readings require immediate medical attention. Patient should be monitored closely and consider contacting healthcare provider or emergency services based on symptom severity.

IMMEDIATE ACTIONS:
- Monitor patient closely for any changes in condition
- Check for symptoms of distress or discomfort
- Have emergency contact information readily available
- Document any additional symptoms or changes

If patient experiences chest pain, difficulty breathing, severe dizziness, or loss of consciousness, call emergency services immediately.`,
    };
  }
}

async function generateEmergencyFallContent(userData, fallDetails) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `PATIENT PROFILE:
- Age: ${userData.age} years
- Gender: ${userData.gender}
- Health Conditions: ${userData.healthConditions?.join(", ") || "None reported"}
- Current Medications: ${
      userData.medications
        ?.map((med) => `${med.name} (${med.dosage})`)
        .join(", ") || "None reported"
    }
- Mobility Status: ${userData.mobilityAids || "Independent"}

INCIDENT DETAILS:
- Fall Severity: ${fallDetails.severity.toUpperCase()}
- Location: ${fallDetails.location}
- Time of Fall: ${fallDetails.timestamp || "Recently occurred"}

ANALYSIS CONSIDERATIONS:
1. Age-related complications (fracture risk for 65+, head injury protocols)
2. Medication-related factors (anticoagulants = bleeding risk, BP meds = orthostatic hypotension, etc.)
3. Pre-existing condition interactions (diabetes, osteoporosis, cardiac conditions)
4. Location-specific injury patterns (bathroom = hip/head, stairs = multiple trauma)

Generate personalized medical guidance with these sections (max 500 words):

IMMEDIATE PRIORITY ACTIONS
- Severity-specific first response recommendations
- Red flag symptoms requiring emergency services
- Vital sign monitoring requirements

PERSONALIZED RISK ASSESSMENT
- Patient-specific complications(include this part if any healthConditions is present) to monitor
- Medication interaction warnings(include this part if any current medication is present)
- Age and condition-based observation periods

FOLLOW-UP CARE RECOMMENDATIONS
- When to contact primary physician
- Symptoms requiring urgent medical evaluation
- Recovery monitoring based on patient profile

Provide clear, actionable medical guidance using the patient's specific risk factors. Include timeframes for actions. Do not include any headers, formalities, or introductory text - deliver direct medical content only. Use proper formatting for headers, bullet points, and bold text for emphasis and readability.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    return {
      body: text,
    };
  } catch (error) {
    console.error("Error generating emergency fall AI content:", error);

    // Fallback content for fall detection
    return {
      body: `Emergency fall detected with ${fallDetails.severity} severity in ${fallDetails.location}. Immediate assistance may be required.

IMMEDIATE ACTIONS:
- Check patient for consciousness and responsiveness
- Do not move patient unless in immediate danger
- Look for obvious signs of injury (bleeding, deformity)
- Monitor breathing and pulse if trained to do so
- Call emergency services if patient is unconscious, bleeding, or reports severe pain

OBSERVATION REQUIREMENTS:
- Watch for signs of head injury (confusion, nausea, dizziness)
- Monitor for delayed symptoms that may appear hours after fall
- Document any complaints of pain or discomfort
- Keep patient warm and comfortable

If patient experiences severe pain, loss of consciousness, heavy bleeding, or inability to move, call emergency services immediately.`,
    };
  }
}

async function generateMedicalInsights(analysisData) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Calculate vital sign deviations and classifications
    const insights = {
      heartRate: null,
      bloodPressure: null,
      oxygenSaturation: null,
    };

    let prompt = `PATIENT PROFILE:
- Age: ${analysisData.age} years
- Gender: ${analysisData.gender}
- Height: ${analysisData.height} cm
- Weight: ${analysisData.weight} kg
- Health Conditions: ${
      analysisData.healthConditions?.join(", ") || "None reported"
    }
- Current Medications: ${
      analysisData.currentMedications
        ?.map((med) => `${med.name} (${med.dosage})`)
        .join(", ") || "None reported"
    }

VITAL SIGNS ANALYSIS:
`;

    // Heart Rate Analysis
    if (analysisData.currentHeartRate && analysisData.normalHeartRate) {
      const hrDeviation = Math.abs(
        analysisData.currentHeartRate - analysisData.normalHeartRate
      );
      const hrDeviationPercent = (
        (hrDeviation / analysisData.normalHeartRate) *
        100
      ).toFixed(1);

      prompt += `\n**HEART RATE ASSESSMENT:**
- Current Reading: ${analysisData.currentHeartRate} BPM
- Patient's Normal Rate: ${analysisData.normalHeartRate} BPM
- Deviation: ${hrDeviation} BPM (${hrDeviationPercent}% from baseline)
- Status: ${
        analysisData.currentHeartRate < analysisData.normalHeartRate
          ? "Below"
          : "Above"
      } normal baseline
`;
    }

    // Blood Pressure Analysis
    if (analysisData.currentBP && analysisData.normalBP) {
      const [normalSys, normalDia] = analysisData.normalBP
        .split("/")
        .map(Number);
      const sysDeviation = Math.abs(
        analysisData.currentBP.systolic - normalSys
      );
      const diaDeviation = Math.abs(
        analysisData.currentBP.diastolic - normalDia
      );

      prompt += `\n**BLOOD PRESSURE ASSESSMENT:**
- Current Reading: ${analysisData.currentBP.systolic}/${
        analysisData.currentBP.diastolic
      } mmHg
- Patient's Normal BP: ${analysisData.normalBP} mmHg
- Systolic Deviation: ${sysDeviation} mmHg
- Diastolic Deviation: ${diaDeviation} mmHg
- Status: Systolic ${
        analysisData.currentBP.systolic < normalSys ? "below" : "above"
      } baseline, Diastolic ${
        analysisData.currentBP.diastolic < normalDia ? "below" : "above"
      } baseline
`;
    }

    // Oxygen Saturation Analysis
    if (analysisData.currentSpo2 && analysisData.normalSpo2) {
      const spo2Deviation = analysisData.normalSpo2 - analysisData.currentSpo2;

      prompt += `\n**OXYGEN SATURATION ASSESSMENT:**
- Current Reading: ${analysisData.currentSpo2}%
- Patient's Normal SpO2: ${analysisData.normalSpo2}%
- Deviation: ${spo2Deviation > 0 ? "-" : "+"}${Math.abs(
        spo2Deviation
      )}% from baseline
- Status: ${
        analysisData.currentSpo2 < analysisData.normalSpo2 ? "Below" : "Above"
      } normal baseline
`;
    }

    prompt += `

COMPREHENSIVE ANALYSIS REQUIREMENTS:
1. Provide medical interpretation of each vital sign relative to patient's personal baseline
2. Consider age-specific normal ranges and how patient's readings compare
3. Analyze potential interactions between health conditions and current readings
4. Assess medication effects on vital signs
5. Identify any concerning patterns or combinations

Generate comprehensive medical insights with these sections (max 800 words):

**VITAL SIGNS INTERPRETATION**
- Clinical significance of each reading compared to patient's baseline
- Age and gender-specific considerations
- Overall cardiovascular and respiratory status assessment

**HEALTH CONDITIONS IMPACT**
${
  analysisData.healthConditions?.length > 0
    ? "- How current health conditions may influence vital sign readings"
    : "- General health status based on vital signs"
}
- Risk factors and complications to monitor
- Condition-specific vital sign targets and concerns

**MEDICATION INTERACTIONS**
${
  analysisData.currentMedications?.length > 0
    ? "- How current medications may affect vital signs"
    : "- No current medications reported"
}
- Potential side effects relevant to current readings
- Monitoring recommendations for medication effectiveness

**LIFESTYLE AND WELLNESS RECOMMENDATIONS**
- Personalized suggestions based on current vital sign patterns
- Risk reduction strategies specific to patient profile
- Activity and dietary considerations
- Stress management recommendations

**MONITORING GUIDELINES**
- Frequency of vital sign monitoring recommendations
- Warning signs that require immediate medical attention
- When to contact healthcare provider
- Long-term health monitoring strategy

Provide evidence-based, personalized medical insights that are actionable and relevant to this specific patient profile. Use clear formatting with headers, bullet points, and emphasis where appropriate. Focus on practical guidance that helps understand the clinical significance of the vital signs in context of the patient's individual health profile.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text().trim();

    return {
      success: true,
      insights: text,
    };
  } catch (error) {
    console.error("Error generating medical insights:", error);

    // Fallback insights
    let fallbackInsights = `**VITAL SIGNS OVERVIEW**\n`;

    if (analysisData.currentHeartRate) {
      fallbackInsights += `- Heart Rate: ${analysisData.currentHeartRate} BPM (Normal baseline: ${analysisData.normalHeartRate} BPM)\n`;
    }

    if (analysisData.currentBP) {
      fallbackInsights += `- Blood Pressure: ${analysisData.currentBP.systolic}/${analysisData.currentBP.diastolic} mmHg (Normal baseline: ${analysisData.normalBP})\n`;
    }

    if (analysisData.currentSpo2) {
      fallbackInsights += `- Oxygen Saturation: ${analysisData.currentSpo2}% (Normal baseline: ${analysisData.normalSpo2}%)\n`;
    }

    fallbackInsights += `\n**GENERAL RECOMMENDATIONS**\n`;
    fallbackInsights += `- Continue monitoring vital signs regularly\n`;
    fallbackInsights += `- Maintain a healthy lifestyle with regular exercise and balanced diet\n`;
    fallbackInsights += `- Contact healthcare provider if you experience any concerning symptoms\n`;
    fallbackInsights += `- Keep track of any changes in your health status\n`;

    if (analysisData.healthConditions?.length > 0) {
      fallbackInsights += `\n**HEALTH CONDITIONS MONITORING**\n`;
      fallbackInsights += `- Continue managing your health conditions: ${analysisData.healthConditions.join(
        ", "
      )}\n`;
      fallbackInsights += `- Follow your healthcare provider's recommendations for condition management\n`;
    }

    return {
      success: false,
      insights: fallbackInsights,
      analysisData: analysisData,
      timestamp: new Date().toISOString(),
      error: "AI analysis temporarily unavailable, showing basic summary",
    };
  }
}

module.exports = {
  generateCriticalHealthContent,
  generateEmergencyFallContent,
  generateMedicalInsights,
};
