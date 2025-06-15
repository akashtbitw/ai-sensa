import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { toast } from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash,
  Save,
  X,
  Loader,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const Settings = () => {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [caregivers, setCaregivers] = useState([]);
  const [originalCaregivers, setOriginalCaregivers] = useState([]);
  const [error, setError] = useState("");
  const [showCaregivers, setShowCaregivers] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    height: "",
    weight: "",
    age: "",
    gender: "",
    healthConditions: [],
    normalHeartRate: "",
    normalBP: "",
    normalSpO2: "",
  });
  const [originalProfileData, setOriginalProfileData] = useState({});
  const [newHealthCondition, setNewHealthCondition] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileHasChanges, setProfileHasChanges] = useState(false);

  // Fetch user profile data including caregivers set during onboarding
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_URL}/api/users/profile/${user?.id}`
        );
        const data = await response.json();

        if (response.ok) {
          setUserData(data.user);
          if (data.user) {
            setProfileData({
              name: data.user.name || "",
              height: data.user.height || "",
              weight: data.user.weight || "",
              age: data.user.age || "",
              gender: data.user.gender || "",
              healthConditions: data.user.healthConditions || [],
              normalHeartRate: data.user.normalHeartRate || "",
              normalBP: data.user.normalBP || "",
              normalSpO2: data.user.normalSpO2 || "",
            });
            setOriginalProfileData({
              name: data.user.name || "",
              height: data.user.height || "",
              weight: data.user.weight || "",
              age: data.user.age || "",
              gender: data.user.gender || "",
              healthConditions: [...(data.user.healthConditions || [])],
              normalHeartRate: data.user.normalHeartRate || "",
              normalBP: data.user.normalBP || "",
              normalSpO2: data.user.normalSpO2 || "",
            });
          }
          // Make sure we're correctly accessing the caregivers from the API response
          if (data.user && Array.isArray(data.user.caregivers)) {
            setCaregivers(data.user.caregivers);
            setOriginalCaregivers(
              JSON.parse(JSON.stringify(data.user.caregivers))
            );
            console.log("Fetched caregivers:", data.user.caregivers);
          } else {
            setCaregivers([]);
            setOriginalCaregivers([]);
            console.log("No caregivers found or invalid format");
          }
        } else {
          setError(data.message || "Failed to load profile data");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("An error occurred while loading your profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchUserData();
    }
  }, [API_URL, user?.id]);

  // Check for changes
  useEffect(() => {
    if (originalCaregivers.length === 0) return;

    const caregiverChanged =
      JSON.stringify(caregivers) !== JSON.stringify(originalCaregivers);
    setHasChanges(caregiverChanged);
  }, [caregivers, originalCaregivers]);

  useEffect(() => {
    if (!originalProfileData.name) return;

    const profileChanged =
      JSON.stringify(profileData) !== JSON.stringify(originalProfileData);
    setProfileHasChanges(profileChanged);
  }, [profileData, originalProfileData]);

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addHealthCondition = () => {
    if (newHealthCondition.trim()) {
      const condition = newHealthCondition.trim();
      if (!profileData.healthConditions.includes(condition)) {
        setProfileData((prev) => ({
          ...prev,
          healthConditions: [...prev.healthConditions, condition],
        }));
        setNewHealthCondition("");
      } else {
        toast.error("This health condition is already added");
      }
    }
  };

  const removeHealthCondition = (index) => {
    setProfileData((prev) => ({
      ...prev,
      healthConditions: prev.healthConditions.filter((_, i) => i !== index),
    }));
  };

  const startEditingProfile = () => {
    setEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setEditingProfile(false);
    setProfileData({
      ...originalProfileData,
      healthConditions: [...originalProfileData.healthConditions],
    });
    setNewHealthCondition("");
  };

  const saveProfileChanges = async () => {
    try {
      // Basic validation
      if (
        !profileData.name.trim() ||
        !profileData.height ||
        !profileData.weight ||
        !profileData.age ||
        !profileData.gender ||
        !profileData.normalHeartRate ||
        !profileData.normalBP ||
        !profileData.normalSpO2
      ) {
        setError("All profile fields are required");
        return;
      }
      if (
        profileData.height <= 0 ||
        profileData.weight <= 0 ||
        profileData.age <= 0
      ) {
        setError("Height, weight, and age must be positive numbers");
        return;
      }
      if (
        profileData.normalHeartRate <= 0 ||
        profileData.normalSpO2 <= 0 ||
        profileData.normalSpO2 > 100
      ) {
        setError("Please enter valid vital signs values");
        return;
      }

      setIsSaving(true);
      setError("");

      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          name: profileData.name.trim(),
          height: Number(profileData.height),
          weight: Number(profileData.weight),
          age: Number(profileData.age),
          gender: profileData.gender,
          healthConditions: profileData.healthConditions,
          normalHeartRate: Number(profileData.normalHeartRate),
          normalBP: profileData.normalBP,
          normalSpO2: Number(profileData.normalSpO2),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save profile data");
      }

      toast.success("Profile updated successfully");
      setEditingProfile(false);
      setOriginalProfileData({ ...profileData });
      setProfileHasChanges(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(error.message || "An error occurred while saving changes");
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input changes for caregiver fields
  const handleCaregiverChange = (index, field, value) => {
    // Clear error when user starts typing
    if (error && (field === "name" || field === "email")) {
      setError("");
    }

    const updatedCaregivers = [...caregivers];
    updatedCaregivers[index] = {
      ...updatedCaregivers[index],
      [field]: value,
    };
    setCaregivers(updatedCaregivers);
  };
  //Removes error message after an interval
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  // Setup confirmation dialog
  const setupConfirmation = (action, params) => {
    setConfirmAction({ type: action, params });
    setShowConfirmDialog(true);
  };

  // Execute confirmed action
  const executeConfirmedAction = () => {
    if (!confirmAction) return;

    setShowConfirmDialog(false);
    setConfirmAction(null);

    switch (confirmAction.type) {
      case "add":
        addCaregiverExecute();
        break;
      case "remove":
        removeCaregiverExecute(confirmAction.params.index);
        break;
      case "save":
        saveChangesExecute();
        break;
      case "edit":
        startEditingExecute(confirmAction.params.index);
        break;
      default:
        break;
    }
  };

  // Cancel confirmation
  const cancelConfirmation = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // Add another caregiver confirmation
  const addCaregiverConfirm = () => {
    if (caregivers.length < 5) {
      setupConfirmation("add");
    } else {
      toast.error("Maximum of 5 caregivers allowed");
    }
  };

  // Add another caregiver execution
  const addCaregiverExecute = () => {
    setCaregivers([...caregivers, { name: "", email: "", phone: "" }]);
    setEditingIndex(caregivers.length);
    toast.success("New caregiver added");
  };

  // Remove a caregiver confirmation
  const removeCaregiverConfirm = (index) => {
    if (index === 0) {
      toast.error("Primary caregiver cannot be removed");
      return;
    }
    setupConfirmation("remove", { index });
  };

  // Remove a caregiver execution
  const removeCaregiverExecute = (index) => {
    if (index > 0) {
      const updatedCaregivers = [...caregivers];
      updatedCaregivers.splice(index, 1);
      setCaregivers(updatedCaregivers);
      setEditingIndex(null);
      toast.success("Caregiver removed successfully");
    }
  };

  // Start editing a caregiver confirmation
  const startEditingConfirm = (index) => {
    setupConfirmation("edit", { index });
  };

  // Start editing a caregiver execution
  const startEditingExecute = (index) => {
    setEditingIndex(index);
    toast.info("Now editing caregiver information");
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingIndex(null);
  };

  // Save caregiver changes confirmation
  const saveChangesConfirm = () => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }
    setupConfirmation("save");
  };

  // Save caregiver changes execution
  const saveChangesExecute = async () => {
    try {
      // Validate caregivers
      if (!caregivers.length) {
        setError("At least one caregiver is required");
        return;
      }

      // Check if primary caregiver has name and email
      if (!caregivers[0].name.trim() || !caregivers[0].email.trim()) {
        setError("Primary caregiver must have Name and Email");
        return;
      }

      // Check all caregivers for valid information
      for (let i = 0; i < caregivers.length; i++) {
        const caregiver = caregivers[i];
        if (!caregiver.name.trim() || !caregiver.email.trim()) {
          setError(`Caregiver #${i + 1} must have Name and Email`);
          return;
        }
      }

      setIsSaving(true);
      setError("");

      // Send updated caregivers to the API
      const response = await fetch(`${API_URL}/api/users/caregivers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          caregivers: caregivers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save caregiver data");
      }

      toast.success("Caregiver information saved successfully");
      setEditingIndex(null);
      setOriginalCaregivers(JSON.parse(JSON.stringify(caregivers)));
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving caregivers:", error);
      setError(error.message || "An error occurred while saving changes");
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500">
          <Loader className="h-12 w-12 text-blue-500" />
        </div>
      </div>
    );
  }

  // Confirmation Dialog
  const ConfirmationDialog = () => {
    if (!showConfirmDialog) return null;

    let message = "";
    let title = "Confirm Action";

    switch (confirmAction?.type) {
      case "add":
        title = "Add New Caregiver";
        message = "Are you sure you want to add a new caregiver?";
        break;
      case "remove":
        title = "Remove Caregiver";
        message =
          "Are you sure you want to remove this caregiver? This action cannot be undone.";
        break;
      case "save":
        title = "Save Changes";
        message = "Are you sure you want to save your changes to caregivers?";
        break;
      case "edit":
        title = "Edit Caregiver";
        message = "Do you want to edit this caregiver's information?";
        break;
      default:
        message = "Are you sure you want to proceed?";
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={cancelConfirmation}
              className="px-4 py-2 text-gray-700 border border-gray-300 cursor-pointer rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={executeConfirmedAction}
              className="px-4 py-2 bg-blue-600 text-white cursor-pointer rounded hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="mb-8">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="bg-blue-600 text-white py-2 px-4 rounded cursor-pointer hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4 flex items-center"
        >
          {showProfile ? (
            <>
              <ChevronUp className="h-5 w-5 mr-1" /> Hide Profile Settings
            </>
          ) : (
            <>
              <ChevronDown className="h-5 w-5 mr-1" /> Edit Profile
            </>
          )}
        </button>

        {showProfile && (
          <div>
            <p className="text-gray-600 mb-4">
              Update your basic profile information.
            </p>

            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Profile Information</h3>
                <div className="flex space-x-2">
                  {editingProfile ? (
                    <button
                      type="button"
                      onClick={cancelEditingProfile}
                      className="text-gray-500 cursor-pointer hover:text-gray-700 flex items-center"
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startEditingProfile}
                      className="text-blue-500 cursor-pointer hover:text-blue-700 flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </button>
                  )}
                </div>
              </div>

              {editingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) =>
                          handleProfileChange("name", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Age <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={profileData.age}
                        onChange={(e) =>
                          handleProfileChange("age", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                        placeholder="Your age"
                        min="1"
                        max="120"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Height (cm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={profileData.height}
                        onChange={(e) =>
                          handleProfileChange("height", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                        placeholder="Height in centimeters"
                        min="1"
                        max="300"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={profileData.weight}
                        onChange={(e) =>
                          handleProfileChange("weight", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                        placeholder="Weight in kilograms"
                        min="1"
                        max="500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={profileData.gender}
                        onChange={(e) =>
                          handleProfileChange("gender", e.target.value)
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <h4 className="text-md font-medium text-gray-800 mb-3 mt-4">
                        Normal Vital Signs
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Normal Heart Rate (bpm){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={profileData.normalHeartRate}
                            onChange={(e) =>
                              handleProfileChange(
                                "normalHeartRate",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                            placeholder="e.g., 72"
                            min="30"
                            max="200"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Normal Blood Pressure{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={profileData.normalBP}
                            onChange={(e) =>
                              handleProfileChange("normalBP", e.target.value)
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                            placeholder="e.g., 120/80"
                            pattern="[0-9]+/[0-9]+"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Normal SpO2 (%){" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={profileData.normalSpO2}
                            onChange={(e) =>
                              handleProfileChange("normalSpO2", e.target.value)
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                            placeholder="e.g., 98"
                            min="70"
                            max="100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Health Conditions (if any)
                    </label>

                    {/* Input for new health condition */}
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newHealthCondition}
                        onChange={(e) => setNewHealthCondition(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
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
                        className={`px-4 py-2 rounded font-medium ${
                          newHealthCondition.trim()
                            ? "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Add
                      </button>
                    </div>

                    {/* Display added health conditions */}
                    {profileData.healthConditions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {profileData.healthConditions.map(
                          (condition, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                            >
                              <span>{condition}</span>
                              <button
                                type="button"
                                onClick={() => removeHealthCondition(index)}
                                className="ml-2 text-blue-600 hover:text-blue-800 cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{profileData.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Age</p>
                    <p className="font-medium">{profileData.age} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Height</p>
                    <p className="font-medium">{profileData.height} cm</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="font-medium">{profileData.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-medium">{profileData.gender}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-sm text-gray-500 font-medium mb-2">
                      Normal Vital Signs
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Heart Rate</p>
                        <p className="font-medium">
                          {profileData.normalHeartRate} bpm
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Blood Pressure</p>
                        <p className="font-medium">{profileData.normalBP}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">SpO2</p>
                        <p className="font-medium">{profileData.normalSpO2}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Health Conditions</p>
                    {profileData.healthConditions.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profileData.healthConditions.map(
                          (condition, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm"
                            >
                              {condition}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="font-medium text-gray-500">
                        None specified
                      </p>
                    )}
                  </div>
                </div>
              )}

              {editingProfile && (
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={saveProfileChanges}
                    disabled={isSaving || !profileHasChanges}
                    className={`flex items-center py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      profileHasChanges
                        ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader className="animate-spin h-4 w-4 mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-8">
        <button
          onClick={() => {
            console.log("Current caregivers:", caregivers);
            setShowCaregivers(!showCaregivers);
          }}
          className="bg-blue-600 text-white py-2 px-4 rounded cursor-pointer hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4 flex items-center"
        >
          {showCaregivers ? (
            <>
              <ChevronUp className="h-5 w-5 mr-1" /> Hide Caregiver Settings
            </>
          ) : (
            <>
              <ChevronDown className="h-5 w-5 mr-1" /> Edit Caregiver Details
            </>
          )}
        </button>

        {showCaregivers && (
          <div>
            <p className="text-gray-600 mb-4">
              You can add up to 5 caregivers. At least one caregiver is
              required.
            </p>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              {caregivers && caregivers.length > 0 ? (
                caregivers.map((caregiver, index) => (
                  <div
                    key={index}
                    className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium">
                        {index === 0
                          ? "Primary Caregiver"
                          : `Caregiver #${index + 1}`}
                      </h3>
                      <div className="flex space-x-2">
                        {editingIndex === index ? (
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="text-gray-500 cursor-pointer hover:text-gray-700 flex items-center"
                          >
                            <X className="h-4 w-4 mr-1" /> Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditingConfirm(index)}
                            className="text-blue-500 cursor-pointer hover:text-blue-700 flex items-center"
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </button>
                        )}
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeCaregiverConfirm(index)}
                            className="text-red-500 cursor-pointer hover:text-red-700 flex items-center"
                          >
                            <Trash className="h-4 w-4 mr-1" /> Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {editingIndex === index ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={caregiver.name || ""}
                            onChange={(e) =>
                              handleCaregiverChange(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                            placeholder="Caregiver's full name"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={caregiver.email || ""}
                            onChange={(e) =>
                              handleCaregiverChange(
                                index,
                                "email",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                            placeholder="Caregiver's email"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-700 text-sm font-medium mb-1">
                            Phone (Optional)
                          </label>
                          <input
                            type="tel"
                            value={caregiver.phone || ""}
                            onChange={(e) =>
                              handleCaregiverChange(
                                index,
                                "phone",
                                e.target.value
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
                            placeholder="Caregiver's phone number"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="font-medium">{caregiver.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium">{caregiver.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium">
                            {caregiver.phone || "Not provided"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">
                    No caregivers found. Add your first caregiver.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                onClick={addCaregiverConfirm}
                disabled={caregivers.length >= 5}
                className={`flex items-center ${
                  caregivers.length >= 5
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 cursor-pointer hover:text-blue-800"
                }`}
              >
                <Plus className="h-5 w-5 mr-1" />
                {caregivers.length >= 5
                  ? "Maximum caregivers reached (5)"
                  : "Add Another Caregiver"}
              </button>

              <button
                type="button"
                onClick={saveChangesConfirm}
                disabled={isSaving || !hasChanges}
                className={`flex items-center py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  hasChanges
                    ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
};

export default Settings;
