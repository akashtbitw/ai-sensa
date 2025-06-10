// Changes to client/src/pages/Onboarding.js
import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";

const Onboarding = () => {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    normalHeartRate: "",
    normalBP: "",
    normalSpO2: "",
    healthConditions: [], // Changed from disease to healthConditions array
    medications: [], // Changed from medications string to medications array
    caregivers: [{ name: "", email: "", phone: "" }], // Array with initial empty caregiver
  });

  // Temporary input states for adding new items
  const [newHealthCondition, setNewHealthCondition] = useState("");
  const [newMedication, setNewMedication] = useState({
    name: "",
    timing: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Prefill name from Clerk if available
  useEffect(() => {
    if (isLoaded && user) {
      setFormData((prev) => ({
        ...prev,
        name: user.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : "",
      }));
    }
  }, [isLoaded, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle adding health condition
  const addHealthCondition = () => {
    if (
      newHealthCondition.trim() &&
      !formData.healthConditions.includes(newHealthCondition.trim())
    ) {
      setFormData({
        ...formData,
        healthConditions: [
          ...formData.healthConditions,
          newHealthCondition.trim(),
        ],
      });
      setNewHealthCondition("");
    }
  };

  // Handle removing health condition
  const removeHealthCondition = (index) => {
    const updated = formData.healthConditions.filter((_, i) => i !== index);
    setFormData({ ...formData, healthConditions: updated });
  };

  // Handle adding medication
  const addMedication = () => {
    if (newMedication.name.trim() && newMedication.timing.trim()) {
      const medicationExists = formData.medications.some(
        (med) =>
          med.name.toLowerCase() === newMedication.name.trim().toLowerCase()
      );

      if (!medicationExists) {
        setFormData({
          ...formData,
          medications: [
            ...formData.medications,
            {
              name: newMedication.name.trim(),
              timing: newMedication.timing.trim(),
            },
          ],
        });
        setNewMedication({ name: "", timing: "" });
      }
    }
  };

  // Handle removing medication
  const removeMedication = (index) => {
    const updated = formData.medications.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: updated });
  };

  // Handle input changes for caregiver fields
  const handleCaregiverChange = (index, field, value) => {
    const updatedCaregivers = [...formData.caregivers];
    updatedCaregivers[index] = {
      ...updatedCaregivers[index],
      [field]: value,
    };
    setFormData({ ...formData, caregivers: updatedCaregivers });
  };

  // Add another caregiver to the form
  const addCaregiverField = () => {
    if (formData.caregivers.length < 5) {
      setFormData({
        ...formData,
        caregivers: [
          ...formData.caregivers,
          { name: "", email: "", phone: "" },
        ],
      });
    }
  };

  // Remove a caregiver from the form
  const removeCaregiverField = (index) => {
    if (formData.caregivers.length > 1) {
      const updatedCaregivers = [...formData.caregivers];
      updatedCaregivers.splice(index, 1);
      setFormData({ ...formData, caregivers: updatedCaregivers });
    }
  };

  const validateStep = (currentStep) => {
    setErrorMessage("");

    if (currentStep === 1) {
      if (!formData.name.trim()) return "Please enter your name";
      if (!formData.age.trim()) return "Please enter your age";
      if (!formData.gender) return "Please select your gender";
      if (!formData.height.trim()) return "Please enter your height";
      if (!formData.weight.trim()) return "Please enter your weight";
    } else if (currentStep === 2) {
      if (!formData.normalHeartRate.trim())
        return "Please enter your normal heart rate";
      if (!formData.normalBP.trim())
        return "Please enter your normal blood pressure";
      if (!formData.normalSpO2.trim()) return "Please enter your normal SpO2";
    } else if (currentStep === 3) {
      // Health conditions and medications can be optional
    } else if (currentStep === 4) {
      // Check primary caregiver
      if (!formData.caregivers.length || !formData.caregivers[0].name.trim()) {
        return "Please enter at least one caregiver name";
      }
      if (!formData.caregivers[0].email.trim()) {
        return "Please enter the primary caregiver's email";
      }

      // Check all other caregivers to ensure they have at least name and email if they were added
      for (let i = 1; i < formData.caregivers.length; i++) {
        const caregiver = formData.caregivers[i];
        if (caregiver.name.trim() && !caregiver.email.trim()) {
          return `Please enter an email for caregiver #${i + 1}`;
        }
        if (!caregiver.name.trim() && caregiver.email.trim()) {
          return `Please enter a name for caregiver #${i + 1}`;
        }
      }
    }

    return "";
  };

  const handleNext = () => {
    const error = validateStep(step);
    if (error) {
      setErrorMessage(error);
      return;
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      if (!user || !user?.id) {
        throw new Error("User not authenticated");
      }

      // Filter out any incomplete caregiver entries
      const validCaregivers = formData.caregivers.filter(
        (caregiver) => caregiver.name.trim() && caregiver.email.trim()
      );

      if (!validCaregivers.length) {
        throw new Error(
          "At least one caregiver with name and email is required"
        );
      }

      console.log("Submitting onboarding data to API...");
      // Send data to your backend API
      const response = await fetch(`${API_URL}/api/users/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          height: formData.height,
          weight: formData.weight,
          normalHeartRate: formData.normalHeartRate,
          normalBP: formData.normalBP,
          normalSpO2: formData.normalSpO2,
          healthConditions: formData.healthConditions, // Send array of health conditions
          medications: formData.medications, // Send array of medication objects
          caregivers: validCaregivers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save user data");
      }

      console.log("Onboarding successful, redirecting to dashboard");

      // Manually bypass the onboarding check and force a hard navigation
      window.sessionStorage.setItem(
        `onboardingCompleted-${user?.primaryEmailAddress}`,
        "true"
      );

      // Use location.replace to force a full page reload
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Onboarding error:", error);
      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="name"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="age"
                >
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Your age"
                  min="0"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-lg mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {["Male", "Female", "Other"].map((option) => (
                    <div
                      key={option}
                      onClick={() =>
                        setFormData({ ...formData, gender: option })
                      }
                      className={`p-4 text-xl border rounded-lg cursor-pointer flex-1 text-center transition-colors ${
                        formData.gender === option
                          ? "bg-blue-500 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="height"
                >
                  Height (cm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Your height in cm"
                  min="50"
                  max="250"
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="weight"
                >
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="Your weight in kg"
                  min="20"
                  max="300"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-6">Normal Vital Signs</h2>
            <div className="space-y-4">
              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="normalHeartRate"
                >
                  Normal Heart Rate (bpm){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="normalHeartRate"
                  name="normalHeartRate"
                  value={formData.normalHeartRate}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="e.g., 72"
                  min="40"
                  max="150"
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="normalBP"
                >
                  Normal Blood Pressure (Sys/Dia) (mmHg){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="normalBP"
                  name="normalBP"
                  value={formData.normalBP}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="e.g., 120/80"
                />
              </div>

              <div>
                <label
                  className="block text-gray-700 text-lg mb-2"
                  htmlFor="normalSpO2"
                >
                  Normal SpO2 (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="normalSpO2"
                  name="normalSpO2"
                  value={formData.normalSpO2}
                  onChange={handleInputChange}
                  className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                  placeholder="e.g., 98"
                  min="90"
                  max="100"
                />
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-6">Health Information</h2>
            <div className="space-y-6">
              {/* Health Conditions Section */}
              <div>
                <label className="block text-gray-700 text-lg mb-2">
                  Health Conditions (if any)
                </label>

                {/* Input for new health condition */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newHealthCondition}
                    onChange={(e) => setNewHealthCondition(e.target.value)}
                    className="flex-1 p-3 text-lg border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                    placeholder="E.g., Diabetes, Hypertension, etc."
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addHealthCondition();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addHealthCondition}
                    disabled={!newHealthCondition.trim()}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      newHealthCondition.trim()
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Add
                  </button>
                </div>

                {/* Display added health conditions */}
                {formData.healthConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.healthConditions.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{condition}</span>
                        <button
                          type="button"
                          onClick={() => removeHealthCondition(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medications Section */}
              <div>
                <label className="block text-gray-700 text-lg mb-2">
                  Current Medications (if any)
                </label>

                {/* Input for new medication */}
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMedication.name}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 p-3 text-lg border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                      placeholder="Medication name"
                    />
                    <input
                      type="time"
                      value={newMedication.timing}
                      onChange={(e) =>
                        setNewMedication({
                          ...newMedication,
                          timing: e.target.value,
                        })
                      }
                      className="flex-1 p-3 text-lg border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                      placeholder=""
                    />
                    <button
                      type="button"
                      onClick={addMedication}
                      disabled={
                        !newMedication.name.trim() ||
                        !newMedication.timing.trim()
                      }
                      className={`px-4 py-2 rounded-lg font-medium ${
                        newMedication.name.trim() && newMedication.timing.trim()
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Display added medications */}
                {formData.medications.length > 0 && (
                  <div className="space-y-2">
                    {formData.medications.map((medication, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-green-800">
                            {medication.name}
                          </span>
                          <span className="text-green-600 ml-2">
                            - {medication.timing}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="text-green-600 hover:text-green-800 text-lg"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-6">
              Caregiver Information
            </h2>

            {formData.caregivers.map((caregiver, index) => (
              <div
                key={index}
                className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">
                    {index === 0
                      ? "Primary Caregiver"
                      : `Caregiver #${index + 1}`}
                  </h3>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeCaregiverField(index)}
                      className="text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-lg mb-2">
                      Caregiver Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={caregiver.name}
                      onChange={(e) =>
                        handleCaregiverChange(index, "name", e.target.value)
                      }
                      className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                      placeholder="Caregiver's full name"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-lg mb-2">
                      Caregiver Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={caregiver.email}
                      onChange={(e) =>
                        handleCaregiverChange(index, "email", e.target.value)
                      }
                      className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                      placeholder="Caregiver's email"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 text-lg mb-2">
                      Caregiver Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={caregiver.phone}
                      onChange={(e) =>
                        handleCaregiverChange(index, "phone", e.target.value)
                      }
                      className="w-full p-4 text-xl border border-gray-300 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200"
                      placeholder="Caregiver's phone number"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addCaregiverField}
              disabled={formData.caregivers.length >= 5}
              className={`mt-2 flex items-center ${
                formData.caregivers.length >= 5
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-600 hover:text-blue-800 cursor-pointer"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {formData.caregivers.length >= 5
                ? "Maximum caregivers reached (5)"
                : "Add Another Caregiver"}
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <h1 className="text-center text-3xl font-extrabold text-blue-900">
          Welcome to AI-SENSA
        </h1>
        <p className="mt-2 text-center text-lg text-gray-600">
          Let's get to know you a little better to provide personalized care
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div className="mb-8 flex justify-center">
            <div className="flex items-center w-full max-w-md">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="relative flex-1">
                  <div
                    className={`h-3 rounded-full transition-colors ${
                      item <= step ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  ></div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-gray-500 whitespace-nowrap">
                    {item === 1 && "Basic Info"}
                    {item === 2 && "Vitals"}
                    {item === 3 && "Health"}
                    {item === 4 && "Caregivers"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12">
            {renderStepContent()}

            {errorMessage && (
              <div className="mt-4 text-red-600 text-lg">{errorMessage}</div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1}
                className={`py-3 px-6 text-lg rounded-lg cursor-pointer ${
                  step === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="bg-blue-600 text-white py-3 px-8 text-lg rounded-lg cursor-pointer hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : step < 4 ? (
                  "Next"
                ) : (
                  "Complete"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
