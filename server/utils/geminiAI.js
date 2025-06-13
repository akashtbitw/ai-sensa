// server/utils/geminiAI.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to generate AI-powered email content
async function generateEmailContent(
  userData,
  vitalType,
  vitalValue,
  details = {}
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `Generate a professional, urgent medical alert email for a healthcare monitoring system. 

Patient Information:
- Name: ${userData.name}
- Age: ${userData.age}
- Gender: ${userData.gender}
- Health Conditions: ${userData.healthConditions?.join(", ") || "None reported"}
- Current Medications: ${
      userData.medications
        ?.map((med) => `${med.name} (${med.dosage})`)
        .join(", ") || "None reported"
    }
- Normal Heart Rate: ${userData.normalHeartRate} BPM
- Normal Blood Pressure: ${userData.normalBP}
- Normal SpO2: ${userData.normalSpO2}%

Alert Details:
`;

    switch (vitalType) {
      case "Heart Rate":
        const normalHR = userData.normalHeartRate;
        const deviation = Math.abs(vitalValue - normalHR);
        const deviationPercent = ((deviation / normalHR) * 100).toFixed(1);

        prompt += `- CRITICAL HEART RATE ALERT
- Current Reading: ${vitalValue} BPM
- Patient's Normal Rate: ${normalHR} BPM
- Deviation: ${deviation} BPM (${deviationPercent}% from normal)
- Classification: ${
          vitalValue < 50
            ? "Bradycardia (Dangerously Low)"
            : "Tachycardia (Dangerously High)"
        }`;
        break;

      case "Blood Pressure":
        const [normalSys, normalDia] = userData.normalBP.split("/").map(Number);
        const sysDeviation = Math.abs(details.systolic - normalSys);
        const diaDeviation = Math.abs(details.diastolic - normalDia);

        prompt += `- CRITICAL BLOOD PRESSURE ALERT
- Current Reading: ${details.systolic}/${details.diastolic} mmHg
- Patient's Normal BP: ${userData.normalBP} mmHg
- Systolic Deviation: ${sysDeviation} mmHg
- Diastolic Deviation: ${diaDeviation} mmHg
- Classification: ${
          details.systolic > 140 || details.diastolic > 90
            ? "Hypertensive Crisis"
            : "Hypotensive Emergency"
        }`;
        break;

      case "SpO2":
        const normalSpO2 = userData.normalSpO2;
        const o2Deviation = normalSpO2 - vitalValue;

        prompt += `- CRITICAL OXYGEN SATURATION ALERT
- Current Reading: ${vitalValue}%
- Patient's Normal SpO2: ${normalSpO2}%
- Deviation: -${o2Deviation}% below normal
- Classification: Severe Hypoxemia - Immediate Medical Attention Required`;
        break;
    }

    prompt += `

Generate a professional email with:
1. Urgent subject line
2. Clear medical assessment of the situation
3. Specific recommendations for immediate action
4. Consider the patient's age, health conditions, and medications in your assessment
5. Maintain professional medical tone while conveying urgency
6. Include timestamp and monitoring system information

Format as JSON with fields: subject, body`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Try to parse as JSON, fallback to structured format if parsing fails
    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Fallback structured response
      return {
        subject: `URGENT: Critical ${vitalType} Alert - ${userData.name}`,
        body: text,
      };
    }
  } catch (error) {
    console.error("Error generating AI email content:", error);
    // Fallback to basic template
    return {
      subject: `URGENT: Critical ${vitalType} Alert - ${userData.name}`,
      body: `A critical ${vitalType} reading has been detected for ${userData.name}. Immediate medical attention may be required. Please contact the patient immediately.`,
    };
  }
}

// Function to generate AI-powered notification content
async function generateNotificationContent(
  userData,
  vitalType,
  vitalValue,
  details = {}
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let prompt = `Generate a concise, urgent push notification for a critical health monitoring alert.

Patient: ${userData.name}, Age: ${userData.age}
Health Conditions: ${userData.healthConditions?.join(", ") || "None"}
Current Medications: ${
      userData.medications?.map((med) => med.name).join(", ") || "None"
    }

Alert Type: ${vitalType}
`;

    switch (vitalType) {
      case "Heart Rate":
        prompt += `Current: ${vitalValue} BPM (Normal: ${userData.normalHeartRate} BPM)`;
        break;
      case "Blood Pressure":
        prompt += `Current: ${details.systolic}/${details.diastolic} mmHg (Normal: ${userData.normalBP})`;
        break;
      case "SpO2":
        prompt += `Current: ${vitalValue}% (Normal: ${userData.normalSpO2}%)`;
        break;
    }

    prompt += `

Generate a JSON response with:
- title: Brief, urgent alert title (max 50 chars)
- body: Concise description with medical context and urgency (max 120 chars)
- Consider patient's specific health conditions and medications in the message`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      // Fallback structured response
      return {
        title: `Critical ${vitalType} Alert`,
        body: `${userData.name}: ${vitalType} reading requires immediate attention. Check patient status.`,
      };
    }
  } catch (error) {
    console.error("Error generating AI notification content:", error);
    return {
      title: `Critical ${vitalType} Alert`,
      body: `Critical ${vitalType} detected for ${userData.name}. Immediate attention required.`,
    };
  }
}

module.exports = {
  generateEmailContent,
  generateNotificationContent,
};
