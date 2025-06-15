import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import NotificationPermission from "../components/NotificationPermission";
import {
  HeartPulse,
  Activity,
  User,
  Bell,
  AlertCircle,
  CheckCircle2,
  Users,
  Calendar,
  TrendingUp,
  Droplets,
  Phone,
  Mail,
  Stethoscope,
  Scale,
  Clock,
  Pill,
  RotateCcw,
  Utensils,
  Edit3,
  Trash2,
  Plus,
  Save,
  X,
  PersonStanding,
  ExternalLink,
  AlertTriangle,
  Heart,
  Siren,
  Eye,
  CheckCheck,
  MoreVertical,
  Sparkles,
  Brain,
  Zap,
} from "lucide-react";
const vitalRangesConfig = {
  "heart-rate": {
    normalRange: { min: 60, max: 100 },
    unit: "BPM",
    dataKey: "bpm",
  },
  "blood-pressure": {
    normalRange: {
      systolic: { min: 90, max: 120 },
      diastolic: { min: 60, max: 80 },
    },
    unit: "mmHg",
  },
  spo2: {
    normalRange: { min: 95, max: 100 },
    unit: "%",
    dataKey: "level",
  },
  "fall-detection": {
    // Fall detection doesn't have a "normal range" but severity levels
    severityColors: {
      low: "yellow",
      medium: "orange",
      high: "red",
    },
  },
};
const Dashboard = () => {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const { user } = useUser();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingMedication, setEditingMedication] = useState(null);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    timing: [""],
    beforeAfterMeal: "",
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState(null);
  const [activeReminders, setActiveReminders] = useState([]);
  const [showReminderHistory, setShowReminderHistory] = useState(false);
  const [reminderHistory, setReminderHistory] = useState([]);
  const [reminderIntervals, setReminderIntervals] = useState([]);
  const [showNotificationPermission, setShowNotificationPermission] =
    useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Mock user data - in real app, this would come from your API
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveVitals, setLiveVitals] = useState({
    heartRate: 75,
    bloodPressure: { systolic: 120, diastolic: 80 },
    spO2: 97,
    fallDetected: false,
    fallSeverity: null,
    fallLocation: null,
    lastFallTime: null,
    lastUpdated: new Date(),
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/api/users/profile/${user?.id}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        setUserData(data.user);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);
  useEffect(() => {
    if (user?.id) {
      // Initial poll
      pollVitalData();

      // Set up polling every minute
      const pollInterval = setInterval(pollVitalData, 300000);

      return () => clearInterval(pollInterval);
    }
  }, [user?.id]);
  const pollVitalData = async () => {
    if (!user?.id) return;

    try {
      const endpoints = [
        `${API_URL}/api/heart-rate/${user.id}?limit=1`,
        `${API_URL}/api/blood-pressure/${user.id}?limit=1`,
        `${API_URL}/api/spo2/${user.id}?limit=1`,
        `${API_URL}/api/fall-detection/${user.id}?limit=1`,
      ];
      console.log("polled");

      const responses = await Promise.all(
        endpoints.map((url) =>
          fetch(url)
            .then((res) => res.json())
            .catch(() => [])
        )
      );

      const [heartRateData, bpData, spo2Data, fallData] = responses;
      setLiveVitals((prev) => ({
        heartRate: heartRateData[0]?.bpm || prev.heartRate,
        bloodPressure: bpData[0]
          ? {
              systolic: bpData[0].systolic,
              diastolic: bpData[0].diastolic,
            }
          : prev.bloodPressure,
        spO2: spo2Data[0]?.level || prev.spO2,
        fallDetected: fallData[0] ? true : false,
        fallSeverity: fallData[0]?.severity || null,
        fallLocation: fallData[0]?.location || null,
        lastFallTime: fallData[0]?.timestamp || prev.lastFallTime,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      console.error("Error polling vital data:", error);
    }
  };

  useEffect(() => {
    // Clear existing intervals
    reminderIntervals.forEach((interval) => clearInterval(interval));

    const newIntervals = [];

    userData?.medications?.forEach((medication, medIndex) => {
      if (medication.timing && Array.isArray(medication.timing)) {
        medication.timing.forEach((time) => {
          const interval = setInterval(() => {
            const now = new Date();
            const currentTime =
              now.getHours().toString().padStart(2, "0") +
              ":" +
              now.getMinutes().toString().padStart(2, "0");

            if (currentTime === time) {
              // Check if reminder already exists for this medication and time today
              const today = now.toDateString();
              const reminderKey = `${medication.name}-${time}-${today}`;

              const existingReminder = activeReminders.find(
                (r) => r.key === reminderKey
              );
              if (!existingReminder) {
                showMedicationReminder(medication, time, reminderKey);
              }
            }
          }, 60000); // Check every minute

          newIntervals.push(interval);
        });
      }
    });

    setReminderIntervals(newIntervals);

    // Load reminder history from localStorage
    const savedHistory = localStorage.getItem("medicationReminderHistory");
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      // Filter history to only show last 1 hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentHistory = history.filter(
        (item) => item.timestamp > oneHourAgo
      );
      setReminderHistory(recentHistory);
      localStorage.setItem(
        "medicationReminderHistory",
        JSON.stringify(recentHistory)
      );
    }

    return () => {
      newIntervals.forEach((interval) => clearInterval(interval));
    };
  }, [userData?.medications]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Get current active reminders and update their status to pending
      const currentActiveReminders = activeReminders.map((reminder) => ({
        ...reminder,
        status: "pending",
        dismissedAt: Date.now(),
      }));

      if (currentActiveReminders.length > 0) {
        // Update history with pending status for active reminders
        const updatedHistory = reminderHistory.map((item) => {
          const activeReminder = currentActiveReminders.find(
            (ar) => ar.id === item.id
          );
          return activeReminder ? activeReminder : item;
        });

        // Add any new active reminders to history
        const newActiveReminders = currentActiveReminders.filter(
          (ar) => !reminderHistory.some((item) => item.id === ar.id)
        );

        const finalHistory = [...updatedHistory, ...newActiveReminders];
        localStorage.setItem(
          "medicationReminderHistory",
          JSON.stringify(finalHistory)
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeReminders, reminderHistory]);

  // Add this useEffect to check notification status on component mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if ("Notification" in window && Notification.permission === "granted") {
        // Check if user has an active subscription
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription =
              await registration.pushManager.getSubscription();
            setNotificationsEnabled(!!subscription);
          }
        } catch (error) {
          console.error("Error checking notification status:", error);
        }
      }
    };

    checkNotificationStatus();
  }, []);

  // Add this useEffect to show notification permission prompt for new users
  useEffect(() => {
    const hasAskedForPermission = localStorage.getItem(
      "hasAskedForNotificationPermission"
    );

    if (
      !hasAskedForPermission &&
      userData?.medications &&
      userData?.medications.length > 0
    ) {
      // Show permission request after 3 seconds if user has medications
      const timer = setTimeout(() => {
        setShowNotificationPermission(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [userData?.medications]);

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Set up polling every 5 minutes (300,000 milliseconds)
    const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000);

    // Cleanup interval on component unmount or user change
    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_URL}/api/notifications/${user.id}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const formatNotificationBody = (body) => {
    if (!body) return "";

    // Split by lines but preserve original spacing for indentation detection
    const lines = body.split("\n").filter((line) => line.trim());

    return lines.map((line, index) => {
      const trimmedLine = line.trim();

      // Check if line is a header with # (new addition)
      if (trimmedLine.startsWith("#")) {
        const headerLevel = (trimmedLine.match(/^#+/) || [""])[0].length;
        const headerText = trimmedLine.replace(/^#+\s*/, "").trim();

        // Style based on header level
        const headerClass =
          headerLevel === 1
            ? "font-bold text-gray-900 mt-6 mb-3 text-xl border-b-2 border-gray-200 pb-2"
            : headerLevel === 2
            ? "font-bold text-gray-900 mt-4 mb-2 text-lg border-b border-gray-200 pb-1"
            : "font-semibold text-gray-800 mt-3 mb-1 text-base";

        return (
          <div key={index} className={headerClass}>
            {headerText}
          </div>
        );
      }

      // Check if line is a main header (enclosed in **)
      if (trimmedLine.startsWith("**") && !trimmedLine.startsWith("***")) {
        const headerText = trimmedLine.replace(/\*\*/g, "").trim();
        return (
          <div
            key={index}
            className="font-bold text-gray-900 mt-4 mb-2 text-base border-b border-gray-200 pb-1"
          >
            {headerText}
          </div>
        );
      }

      // Check if line is a sub-header (starts with ***)
      if (trimmedLine.startsWith("***")) {
        const headerText = trimmedLine.replace(/\*\*\*/g, "").trim();
        return (
          <div
            key={index}
            className="font-semibold text-gray-800 mt-3 mb-1 text-sm"
          >
            {headerText}
          </div>
        );
      }

      // Check if line is a bullet point (starts with * or •)
      if (trimmedLine.startsWith("*") || trimmedLine.startsWith("•")) {
        // Calculate indentation level based on leading spaces
        const leadingSpaces = line.length - line.trimStart().length;
        let indentClass = "ml-3"; // Default indentation

        if (leadingSpaces >= 4) {
          indentClass = "ml-8"; // Nested indentation for 4+ spaces
        }

        // Remove bullet marker and get text
        let bulletText = trimmedLine.replace(/^[*•]\s*/, "").trim();

        // Handle bold text within bullet points (modified to handle single *)
        const formatText = (text) => {
          if (!text.includes("*")) return text;

          // Handle both single * and double ** for bold
          let formattedText = text;

          // First handle double asterisks (**)
          if (formattedText.includes("**")) {
            const parts = formattedText.split("**");
            formattedText = parts
              .map((part, i) => (i % 2 === 1 ? `<BOLD>${part}</BOLD>` : part))
              .join("");
          }

          // Then handle single asterisks (*) that aren't part of **
          if (formattedText.includes("*") && !formattedText.includes("**")) {
            const parts = formattedText.split("*");
            formattedText = parts
              .map((part, i) => (i % 2 === 1 ? `<BOLD>${part}</BOLD>` : part))
              .join("");
          }

          // Convert placeholder tags to JSX
          return formattedText
            .split(/<BOLD>|<\/BOLD>/)
            .map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            );
        };

        return (
          <div
            key={index}
            className={`${indentClass} text-sm text-gray-600 mb-1 flex items-start`}
          >
            <span className="text-blue-500 mr-2 mt-1">•</span>
            <span>{formatText(bulletText)}</span>
          </div>
        );
      }

      // Check if line contains ** but doesn't start with ** (inline bold formatting)
      if (trimmedLine.includes("**") && !trimmedLine.startsWith("**")) {
        const parts = trimmedLine.split("**");
        const formattedText = parts.map((part, i) =>
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        );

        return (
          <div
            key={index}
            className="text-sm text-gray-700 mb-2 leading-relaxed"
          >
            {formattedText}
          </div>
        );
      }

      // Regular text - handle bold formatting (modified to handle single *)
      let formattedText = trimmedLine;

      // Handle single asterisk formatting for regular text
      if (trimmedLine.includes("*")) {
        // First handle double asterisks (**)
        if (trimmedLine.includes("**")) {
          const parts = trimmedLine.split("**");
          formattedText = parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          );
        }
        // Then handle single asterisks (*) only if no double asterisks
        else {
          const parts = trimmedLine.split("*");
          formattedText = parts.map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          );
        }
      }

      return (
        <div key={index} className="text-sm text-gray-600 mb-1 leading-relaxed">
          {formattedText}
        </div>
      );
    });
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      // Define endpoints for current vitals
      const endpoints = [
        `${API_URL}/api/heart-rate/${user.id}?limit=1`,
        `${API_URL}/api/blood-pressure/${user.id}?limit=1`,
        `${API_URL}/api/spo2/${user.id}?limit=1`,
      ];

      // Fetch current vitals data
      const vitalsPromises = endpoints.map((endpoint) =>
        fetch(endpoint, {
          headers: {
            "Content-Type": "application/json",
          },
        }).then((res) => res.json())
      );

      const [heartRateData, bloodPressureData, spo2Data] = await Promise.all(
        vitalsPromises
      );

      // Extract current values based on your MongoDB models
      const currentHeartRate = heartRateData?.[0]?.bpm || null;
      const currentBP = bloodPressureData?.[0] || null;
      const currentSpo2 = spo2Data?.[0]?.level || null;

      // Prepare data for AI analysis matching your User model structure
      const analysisData = {
        // Personal info from userData (User model fields)
        userId: user?.id,
        age: userData.age,
        gender: userData.gender,
        height: userData.height,
        weight: userData.weight,

        // Normal baseline values from userData (User model fields)
        normalHeartRate: userData.normalHeartRate,
        normalBP: userData.normalBP,
        normalSpo2: userData.normalSpO2,

        // Current vital signs from API responses
        currentHeartRate: currentHeartRate,
        currentBP: currentBP
          ? {
              systolic: currentBP.systolic,
              diastolic: currentBP.diastolic,
            }
          : null,
        currentSpo2: currentSpo2,

        // Health conditions and medications from userData (User model fields)
        healthConditions: userData.healthConditions || [],
        currentMedications:
          userData.medications?.map((med) => ({
            name: med.name,
            dosage: med.dosage,
          })) || [],
      };

      // Send data to AI analysis endpoint
      const response = await fetch(`${API_URL}/api/ai/insight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
      // Handle error - maybe show a toast or alert
      alert("Failed to generate AI analysis. Please try again.");
    } finally {
      fetchNotifications();
      setIsAnalyzing(false);
    }
  };

  const getNotificationPreview = (body) => {
    if (!body) return "";

    // Remove all formatting markers and headers
    const cleanText = body
      .replace(/^#+\s*/gm, "") // Remove # headers (## Header -> Header)
      .replace(/\*\*/g, "") // Remove all ** markers
      .replace(/\*/g, "") // Remove single * markers
      .replace(/\n/g, " ") // Replace line breaks with spaces
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    // Return truncated version
    return cleanText.length > 120
      ? `${cleanText.substring(0, 120)}...`
      : cleanText;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "critical_health_condition":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "health_report":
        return <Heart className="w-4 h-4 text-blue-500" />;
      case "medication_reminder":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "appointment_reminder":
        return <Calendar className="w-4 h-4 text-purple-500" />;
      case "emergency_alert":
        return <Siren className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };
  const getNotificationColor = (type) => {
    switch (type) {
      case "critical_health_condition":
        return "border-red-500 bg-red-50";
      case "health_report":
        return "border-blue-500 bg-blue-50";
      case "medication_reminder":
        return "border-green-500 bg-green-50";
      case "appointment_reminder":
        return "border-purple-500 bg-purple-50";
      case "emergency_alert":
        return "border-red-600 bg-red-100";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };
  const formatTimeAgo = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };
  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification);
    setShowNotificationModal(true);

    // Mark notification as read if not already read
    if (!notification.read) {
      try {
        await fetch(
          `${API_URL}/api/notifications/${user.id}/${notification._id}/read`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id
              ? { ...n, read: true, readAt: new Date() }
              : n
          )
        );
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await fetch(`${API_URL}/api/notifications/${user.id}/read-all`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );

      setShowOptionsMenu(false);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!user?.id) return;

    try {
      await fetch(`${API_URL}/api/notifications/${user.id}/${notificationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Update local state
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));

      // Close modal if the deleted notification was being viewed
      if (selectedNotification?._id === notificationId) {
        setShowNotificationModal(false);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };
  const openVitalTracking = (vitalType) => {
    navigate(`/view-data/${vitalType}`);
  };

  const getHeartRateStatus = (bpm) => {
    const config = vitalRangesConfig["heart-rate"];
    if (!bpm || bpm === 0)
      return { status: "No Data", color: "text-gray-500", bg: "bg-gray-50" };

    if (bpm < config.normalRange.min) {
      return { status: "Low", color: "text-blue-600", bg: "bg-blue-50" };
    } else if (bpm > config.normalRange.max) {
      return { status: "High", color: "text-red-600", bg: "bg-red-50" };
    } else {
      return { status: "Normal", color: "text-green-600", bg: "bg-green-50" };
    }
  };

  const getIndividualBloodPressureStatus = (systolic, diastolic) => {
    const config = vitalRangesConfig["blood-pressure"];

    // Helper function to get status for a single value
    const getValueStatus = (value, range, type) => {
      if (!value || value === 0) {
        return { status: "No Data", color: "text-gray-500" };
      }

      if (value < range.min) {
        return { status: "Low", color: "text-blue-600" };
      } else if (value > range.max) {
        return { status: "High", color: "text-red-600" };
      } else {
        return { status: "Normal", color: "text-green-600" };
      }
    };

    const systolicStatus = getValueStatus(
      systolic,
      config.normalRange.systolic,
      "systolic"
    );

    const diastolicStatus = getValueStatus(
      diastolic,
      config.normalRange.diastolic,
      "diastolic"
    );

    return { systolicStatus, diastolicStatus };
  };

  const getBloodPressureStatus = (systolic, diastolic) => {
    const config = vitalRangesConfig["blood-pressure"];
    if (!systolic || !diastolic || systolic === 0 || diastolic === 0) {
      return { status: "No Data", color: "text-gray-500", bg: "bg-gray-50" };
    }

    const systolicStatus =
      systolic < config.normalRange.systolic.min
        ? "low"
        : systolic > config.normalRange.systolic.max
        ? "high"
        : "normal";
    const diastolicStatus =
      diastolic < config.normalRange.diastolic.min
        ? "low"
        : diastolic > config.normalRange.diastolic.max
        ? "high"
        : "normal";

    // Determine overall status based on worse of the two
    if (systolicStatus === "high" || diastolicStatus === "high") {
      return { status: "High", color: "text-red-600", bg: "bg-red-50" };
    } else if (systolicStatus === "low" || diastolicStatus === "low") {
      return { status: "Low", color: "text-blue-600", bg: "bg-blue-50" };
    } else {
      return { status: "Normal", color: "text-green-600", bg: "bg-green-50" };
    }
  };

  const getSpO2Status = (level) => {
    const config = vitalRangesConfig["spo2"];
    if (!level || level === 0)
      return { status: "No Data", color: "text-gray-500", bg: "bg-gray-50" };

    if (level < config.normalRange.min) {
      return { status: "Low", color: "text-red-600", bg: "bg-red-50" }; // Low SpO2 is critical
    } else if (level > config.normalRange.max) {
      return { status: "High", color: "text-blue-600", bg: "bg-blue-50" }; // Unlikely but possible
    } else {
      return { status: "Normal", color: "text-green-600", bg: "bg-green-50" };
    }
  };

  const getFallDetectionStatus = (fallDetected, fallSeverity) => {
    if (!fallDetected) {
      return { status: "No Falls", color: "text-green-600", bg: "bg-gray-50" };
    }

    switch (fallSeverity) {
      case "high":
        return {
          status: `${fallSeverity?.toUpperCase()} Severity Fall`,
          color: "text-red-600",
          bg: "bg-red-100",
        };
      case "medium":
        return {
          status: `${fallSeverity?.toUpperCase()} Severity Fall`,
          color: "text-orange-600",
          bg: "bg-orange-100",
        };
      case "low":
        return {
          status: `${fallSeverity?.toUpperCase()} Severity Fall`,
          color: "text-yellow-600",
          bg: "bg-yellow-100",
        };
      default:
        return {
          status: "Fall Detected",
          color: "text-red-600",
          bg: "bg-red-100",
        };
    }
  };

  // 3. Add this function to show medication reminder
  // Updated showMedicationReminder function
  const showMedicationReminder = async (medication, time, reminderKey) => {
    // Play notification sound (existing code)
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgAzON2vLCayEsAA=="
    );
    audio.play().catch((e) => console.log("Audio play failed:", e));

    // Show in-app notification (existing code)
    const newReminder = {
      key: reminderKey,
      medication,
      time,
      timestamp: Date.now(),
      id: Date.now() + Math.random(),
    };

    setActiveReminders((prev) => [...prev, newReminder]);

    // Add to history (existing code)
    const historyItem = {
      ...newReminder,
      status: "active",
    };

    setReminderHistory((prevHistory) => {
      const updatedHistory = [...prevHistory, historyItem];
      localStorage.setItem(
        "medicationReminderHistory",
        JSON.stringify(updatedHistory)
      );
      return updatedHistory;
    });

    // Send push notification if enabled
    if (notificationsEnabled) {
      try {
        const bodyMessage = [
          `Time to take ${medication.name} (${medication.dosage}mg)`,
          medication.beforeAfterMeal && `Take ${medication.beforeAfterMeal}`,
          `Scheduled for: ${time}`,
        ]
          .filter(Boolean)
          .join("\n");

        // Create a unique tag for this specific medication reminder
        const uniqueTag = `medication-${
          medication.name
        }-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await fetch(`${API_URL}/api/notifications/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userData.userId,
            title: "💊 Medication Reminder",
            body: bodyMessage,
            tag: uniqueTag, // Pass the unique tag
            data: {
              type: "medication",
              medication: medication,
              time: time,
              reminderId: newReminder.id, // Include reminder ID for tracking
            },
          }),
        });
      } catch (error) {
        console.error("Error sending push notification:", error);
      }
    }
  };

  const handleNotificationPermission = (granted) => {
    localStorage.setItem("hasAskedForNotificationPermission", "true");
    setNotificationsEnabled(granted);
    setShowNotificationPermission(false);
  };

  const handleReminderDismiss = (reminderId) => {
    setActiveReminders((prev) => prev.filter((r) => r.id !== reminderId));

    // Update history to pending state
    setReminderHistory((prevHistory) => {
      const updatedHistory = prevHistory.map((item) =>
        item.id === reminderId
          ? { ...item, status: "pending", dismissedAt: Date.now() }
          : item
      );
      localStorage.setItem(
        "medicationReminderHistory",
        JSON.stringify(updatedHistory)
      );
      return updatedHistory;
    });
  };

  const handleReminderAcknowledge = (reminderId) => {
    // Remove from active reminders
    setActiveReminders((prev) => prev.filter((r) => r.id !== reminderId));

    // Update history to acknowledged
    const updatedHistory = reminderHistory.map((item) =>
      item.id === reminderId
        ? { ...item, status: "acknowledged", acknowledgedAt: Date.now() }
        : item
    );
    setReminderHistory(updatedHistory);
    localStorage.setItem(
      "medicationReminderHistory",
      JSON.stringify(updatedHistory)
    );
  };

  const handleEditMedication = (index) => {
    setEditingMedication({
      index,
      ...userData.medications[index],
      timing: Array.isArray(userData.medications[index].timing)
        ? userData.medications[index].timing
        : [userData.medications[index].timing],
    });
  };

  const handleSaveEdit = async () => {
    try {
      const updatedMedications = [...userData.medications];
      updatedMedications[editingMedication.index] = {
        name: editingMedication.name,
        dosage: editingMedication.dosage,
        frequency: editingMedication.frequency,
        timing: editingMedication.timing.filter((time) => time.trim() !== ""),
        beforeAfterMeal: editingMedication.beforeAfterMeal,
      };

      const response = await fetch(`${API_URL}/api/users/medications`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          medications: updatedMedications,
        }),
      });

      if (response.ok) {
        setUserData((prev) => ({
          ...prev,
          medications: updatedMedications,
        }));
        setEditingMedication(null);
      }
    } catch (error) {
      console.error("Error updating medication:", error);
    }
  };

  const handleDeleteMedication = (index) => {
    setMedicationToDelete(index);
    setShowDeleteAlert(true);
  };

  // Add this new function
  const handleConfirmDelete = async () => {
    if (medicationToDelete !== null) {
      try {
        const updatedMedications = userData.medications.filter(
          (_, i) => i !== medicationToDelete
        );

        const response = await fetch(`${API_URL}/api/users/medications`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            medications: updatedMedications,
          }),
        });

        if (response.ok) {
          setUserData((prev) => ({
            ...prev,
            medications: updatedMedications,
          }));
        }
      } catch (error) {
        console.error("Error deleting medication:", error);
      }
    }

    setShowDeleteAlert(false);
    setMedicationToDelete(null);
  };

  const handleAddMedication = async () => {
    if (
      !newMedication.name ||
      !newMedication.dosage ||
      !newMedication.frequency ||
      !newMedication.timing.some((time) => time.trim() !== "")
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const medicationToAdd = {
        ...newMedication,
        timing: newMedication.timing.filter((time) => time.trim() !== ""),
      };

      const updatedMedications = [...userData.medications, medicationToAdd];

      const response = await fetch(`${API_URL}/api/users/medications`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          medications: updatedMedications,
        }),
      });

      if (response.ok) {
        setUserData((prev) => ({
          ...prev,
          medications: updatedMedications,
        }));
        setNewMedication({
          name: "",
          dosage: "",
          frequency: "",
          timing: [""],
          beforeAfterMeal: "",
        });
        setShowAddMedication(false);
      }
    } catch (error) {
      console.error("Error adding medication:", error);
    }
  };

  const addTimingField = (isEdit = false) => {
    if (isEdit) {
      setEditingMedication((prev) => ({
        ...prev,
        timing: [...prev.timing, ""],
      }));
    } else {
      setNewMedication((prev) => ({
        ...prev,
        timing: [...prev.timing, ""],
      }));
    }
  };

  const removeTimingField = (index, isEdit = false) => {
    if (isEdit) {
      setEditingMedication((prev) => ({
        ...prev,
        timing: prev.timing.filter((_, i) => i !== index),
      }));
    } else {
      setNewMedication((prev) => ({
        ...prev,
        timing: prev.timing.filter((_, i) => i !== index),
      }));
    }
  };

  const updateTimingField = (index, value, isEdit = false) => {
    if (isEdit) {
      setEditingMedication((prev) => ({
        ...prev,
        timing: prev.timing.map((time, i) => (i === index ? value : time)),
      }));
    } else {
      setNewMedication((prev) => ({
        ...prev,
        timing: prev.timing.map((time, i) => (i === index ? value : time)),
      }));
    }
  };

  const calculateBMI = () => {
    const heightInMeters = userData?.height / 100;
    const bmi = userData?.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: "Underweight", color: "text-blue-600" };
    if (bmi < 25) return { category: "Normal", color: "text-green-600" };
    if (bmi < 30) return { category: "Overweight", color: "text-yellow-600" };
    return { category: "Obese", color: "text-red-600" };
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const bmi = calculateBMI();
  const bmiInfo = getBMICategory(parseFloat(bmi));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading dashboard: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getGreeting()}, {userData.name}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                {currentTime.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {/* Animated background overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 group-hover:animate-pulse"></div>

                {/* Button content */}
                <div className="relative flex items-center space-x-2">
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="text-sm font-medium">AI Insights</span>
                      <Sparkles className="w-4 h-4 group-hover:animate-bounce" />
                    </>
                  )}
                </div>

                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition-opacity duration-300 -z-10"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Current Vitals - Large Card */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Activity className="w-6 h-6 mr-2 text-blue-500" />
                Current Vitals
              </h2>
              <div className="text-sm text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Last updated: {liveVitals.lastUpdated.toLocaleTimeString()}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Heart Rate Card */}
              {(() => {
                const heartRateStatus = getHeartRateStatus(
                  liveVitals.heartRate
                );
                return (
                  <div
                    onClick={() => openVitalTracking("heart-rate")}
                    className={`p-4 rounded-lg ${heartRateStatus.bg} border relative group cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-2 hover:border-red-300`}
                  >
                    <button
                      className="cursor-pointer absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                      title="View live heart rate tracking"
                    >
                      <ExternalLink className="cursor-pointer w-3 h-3 text-gray-600" />
                    </button>
                    <div className="flex items-center mb-2 transition-colors duration-200 group-hover:text-red-600">
                      <HeartPulse className="w-5 h-5 text-red-500 mr-2 transition-all duration-300 group-hover:scale-110 group-hover:text-red-600" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">
                        Heart Rate
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-red-700 group-hover:scale-110">
                      {liveVitals.heartRate || 0}
                    </div>
                    <div className="text-xs text-gray-500">BPM</div>
                    <div
                      className={`text-xs mt-1 ${heartRateStatus.color} font-medium`}
                    >
                      {heartRateStatus.status}
                    </div>
                  </div>
                );
              })()}

              {/* Blood Pressure Card */}
              {(() => {
                const { systolicStatus, diastolicStatus } =
                  getIndividualBloodPressureStatus(
                    liveVitals.bloodPressure.systolic,
                    liveVitals.bloodPressure.diastolic
                  );

                // Overall status for background color (you can keep this for the card background)
                const overallStatus = getBloodPressureStatus(
                  liveVitals.bloodPressure.systolic,
                  liveVitals.bloodPressure.diastolic
                );

                return (
                  <div
                    onClick={() => openVitalTracking("blood-pressure")}
                    className={`p-4 rounded-lg ${overallStatus.bg} border relative group cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-2 hover:border-green-300`}
                  >
                    <button
                      className="cursor-pointer absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                      title="View live blood pressure tracking"
                    >
                      <ExternalLink className="cursor-pointer w-3 h-3 text-gray-600" />
                    </button>
                    <div className="flex items-center mb-2 transition-colors duration-200 group-hover:text-green-600">
                      <Activity className="w-5 h-5 text-green-500 mr-2 transition-all duration-300 group-hover:scale-110 group-hover:text-green-600" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">
                        Blood Pressure
                      </span>
                    </div>

                    {/* Individual status display */}
                    <div className="flex items-center gap-1 mb-2">
                      <div className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-green-700 group-hover:scale-110">
                        <span className={systolicStatus.color}>
                          {liveVitals.bloodPressure.systolic || 0}
                        </span>
                        <span className="text-gray-500">/</span>
                        <span className={diastolicStatus.color}>
                          {liveVitals.bloodPressure.diastolic || 0}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">mmHg</div>

                    {/* Individual status labels */}
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Systolic:</span>
                        <span className={`${systolicStatus.color} font-medium`}>
                          {systolicStatus.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Diastolic:</span>
                        <span
                          className={`${diastolicStatus.color} font-medium`}
                        >
                          {diastolicStatus.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SpO2 Card */}
              {(() => {
                const spo2Status = getSpO2Status(liveVitals.spO2);
                return (
                  <div
                    onClick={() => openVitalTracking("spo2")}
                    className={`p-4 rounded-lg ${spo2Status.bg} border relative group cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-2 hover:border-blue-300`}
                  >
                    <button
                      className="cursor-pointer absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                      title="View live SpO2 tracking"
                    >
                      <ExternalLink className="cursor-pointer w-3 h-3 text-gray-600" />
                    </button>
                    <div className="flex items-center mb-2 transition-colors duration-200 group-hover:text-blue-600">
                      <Droplets className="w-5 h-5 text-blue-500 mr-2 transition-all duration-300 group-hover:scale-110 group-hover:text-blue-600" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                        SpO2
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-blue-700 group-hover:scale-110">
                      {liveVitals.spO2 || 0}%
                    </div>
                    <div className="text-xs text-gray-500">Oxygen</div>
                    <div
                      className={`text-xs mt-1 ${spo2Status.color} font-medium`}
                    >
                      {spo2Status.status}
                    </div>
                  </div>
                );
              })()}

              {/* Fall Detection Card */}
              {(() => {
                const fallStatus = getFallDetectionStatus(
                  liveVitals.fallDetected,
                  liveVitals.fallSeverity
                );
                return (
                  <div
                    onClick={() => openVitalTracking("fall-detection")}
                    className={`p-4 rounded-lg border relative group cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-2 ${
                      fallStatus.bg
                    } ${
                      liveVitals.fallDetected
                        ? liveVitals.fallSeverity === "high"
                          ? "hover:bg-red-200 hover:border-red-400"
                          : liveVitals.fallSeverity === "medium"
                          ? "hover:bg-orange-200 hover:border-orange-400"
                          : "hover:bg-yellow-200 hover:border-yellow-400"
                        : "hover:bg-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <button
                      className="cursor-pointer absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded-full shadow-md hover:bg-gray-50"
                      title="View fall detection history"
                    >
                      <ExternalLink className="cursor-pointer w-3 h-3 text-gray-600" />
                    </button>
                    <div className="flex items-center mb-2 transition-colors duration-200">
                      <PersonStanding
                        className={`w-5 h-5 mr-2 transition-all duration-300 group-hover:scale-110 ${
                          liveVitals.fallDetected
                            ? liveVitals.fallSeverity === "high"
                              ? "text-red-600 group-hover:text-red-700"
                              : liveVitals.fallSeverity === "medium"
                              ? "text-orange-600 group-hover:text-orange-700"
                              : "text-yellow-600 group-hover:text-yellow-700"
                            : "text-gray-500 group-hover:text-gray-600"
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-700 transition-colors duration-200 group-hover:text-gray-800">
                        Fall Detection
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 transition-all duration-300 group-hover:scale-110">
                      {liveVitals.fallDetected ? "ALERT" : "SAFE"}
                    </div>
                    {liveVitals.fallDetected && liveVitals.fallLocation && (
                      <div className="text-xs text-gray-600 mb-1">
                        Location: {liveVitals.fallLocation}
                      </div>
                    )}
                    {liveVitals.fallDetected && liveVitals.lastFallTime && (
                      <div className="text-xs text-gray-600 mb-1">
                        Time:{" "}
                        {new Date(liveVitals.lastFallTime).toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">Status</div>
                    <div
                      className={`text-xs mt-1 font-medium ${fallStatus.color}`}
                    >
                      {fallStatus.status}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Normal Vitals Reference */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Your Normal Vital Signs Reference
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                  <span className="text-blue-700 flex items-center text-sm font-medium">
                    <HeartPulse className="w-4 h-4 mr-2 text-red-500" />
                    Normal Heart Rate
                  </span>
                  <span className="font-bold text-blue-900 text-md pl-4">
                    {userData.normalHeartRate} BPM
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                  <span className="text-blue-700 flex items-center text-sm font-medium">
                    <Activity className="w-4 h-4 mr-2 text-green-500" />
                    Normal Blood Pressure
                  </span>
                  <span className="font-bold text-blue-900 text-md pl-4">
                    {userData.normalBP} mmHg
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                  <span className="text-blue-700 flex items-center text-sm font-medium">
                    <Droplets className="w-4 h-4 mr-2 text-blue-500" />
                    Normal SpO2
                  </span>
                  <span className="font-bold text-blue-900 text-md">
                    {userData.normalSpO2}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats*/}
          <div className="flex flex-col h-full">
            {/* BMI Card */}
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500 flex-1 mb-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <Scale className="w-5 h-5 mr-2 text-purple-500" />
                  BMI Status
                </h3>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                    {bmi}
                  </div>
                  <div
                    className={`text-base font-medium ${bmiInfo.color} mb-3`}
                  >
                    {bmiInfo.category}
                  </div>
                  <div className="text-sm text-gray-500">
                    Height: {userData.height}cm | Weight: {userData.weight}kg
                  </div>
                </div>
              </div>
            </div>

            {/* Health Summary */}
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500 flex-1 flex flex-col">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Stethoscope className="w-5 h-5 mr-2 text-green-500" />
                Health Summary
              </h3>
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-600 font-medium">Age:</span>
                    <span className="font-bold text-gray-900">
                      {userData.age} years
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-gray-600 font-medium">Gender:</span>
                    <span className="font-bold text-gray-900">
                      {userData.gender}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400 flex-shrink-0">
                  <div className="text-sm text-yellow-800 font-semibold mb-2">
                    Health Conditions:
                  </div>
                  {userData.healthConditions &&
                    userData.healthConditions.length > 0 && (
                      <div className="text-sm text-yellow-700 leading-relaxed max-h-12 overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-400 scrollbar-track-yellow-100">
                        {userData.healthConditions.join(", ")}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-orange-500" />
                Recent Notifications
              </h2>
              <div className="flex items-center space-x-2">
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                  {notifications.filter((n) => !n.read).length} New
                </span>
                {notifications.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                      className="cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {showOptionsMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-10">
                        <button
                          onClick={handleMarkAllAsRead}
                          className="cursor-pointer w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg flex items-center"
                        >
                          <CheckCheck className="w-4 h-4 mr-2" />
                          Mark All as Read
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`group flex items-start p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                      notification.read
                        ? "border-gray-200 bg-white"
                        : getNotificationColor(notification.type)
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="mr-3 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p
                          className={`text-sm font-medium ${
                            notification.read
                              ? "text-gray-600"
                              : "text-gray-800"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <div className="flex items-center ml-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(notification._id);
                            }}
                            className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-all"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {getNotificationPreview(notification.body)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notification Details Modal */}
          {showNotificationModal && selectedNotification && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div
                  className={`p-6 border-l-4 ${
                    getNotificationColor(selectedNotification.type).split(
                      " "
                    )[0]
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getNotificationIcon(selectedNotification.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {selectedNotification.title}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimeAgo(selectedNotification.createdAt)}
                          {selectedNotification.read &&
                            selectedNotification.readAt && (
                              <span className="ml-2 text-green-600">
                                • Read
                              </span>
                            )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowNotificationModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-gray-600 leading-relaxed text-sm sm:text-base max-w-none">
                        {formatNotificationBody(selectedNotification.body)}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                        <span>
                          Type:{" "}
                          {selectedNotification.type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <span>ID: {selectedNotification._id.slice(-6)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between">
                    <button
                      onClick={() =>
                        handleDeleteNotification(selectedNotification._id)
                      }
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                    <button
                      onClick={() => setShowNotificationModal(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Medications - Now in the bottom grid */}

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 group/container">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Stethoscope className="w-5 h-5 mr-2 text-blue-500" />
                Current Medications
              </h2>
              <div className="flex items-center space-x-2">
                {/* Reminder History Button */}
                <button
                  onClick={() => setShowReminderHistory(true)}
                  className="cursor-pointer flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 hover:scale-110 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg relative"
                  title="View reminder history"
                >
                  <Bell className="w-5 h-5" />
                  {reminderHistory.filter((r) => r.status === "pending")
                    .length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {
                        reminderHistory.filter((r) => r.status === "pending")
                          .length
                      }
                    </span>
                  )}
                </button>

                {/* Add Medication Button */}
                {userData.medications.length > 0 && (
                  <button
                    onClick={() => setShowAddMedication(true)}
                    className="cursor-pointer flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:scale-110 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg"
                    title="Add new medication"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
            </div>

            {userData.medications && userData.medications.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-3">
                {userData.medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border-none hover:bg-gray-100 transition-colors group"
                  >
                    {editingMedication && editingMedication.index === index ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={editingMedication.name}
                            onChange={(e) =>
                              setEditingMedication((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="font-medium text-gray-800 text-sm bg-white border border-gray-300 rounded px-2 py-1 flex-1 mr-2"
                            placeholder="Medication name"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="cursor-pointer p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingMedication(null)}
                              className="cursor-pointer p-1 text-gray-600 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="ml-10 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <input
                              type="text"
                              value={editingMedication.dosage}
                              onChange={(e) =>
                                setEditingMedication((prev) => ({
                                  ...prev,
                                  dosage: e.target.value,
                                }))
                              }
                              className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-xs flex-1 min-w-[80px]"
                              placeholder="Dosage"
                            />
                            <input
                              type="text"
                              value={editingMedication.frequency}
                              onChange={(e) =>
                                setEditingMedication((prev) => ({
                                  ...prev,
                                  frequency: e.target.value,
                                }))
                              }
                              className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs flex-1 min-w-[80px]"
                              placeholder="Frequency"
                            />
                            <select
                              value={editingMedication.beforeAfterMeal}
                              onChange={(e) =>
                                setEditingMedication((prev) => ({
                                  ...prev,
                                  beforeAfterMeal: e.target.value,
                                }))
                              }
                              className="cursor-pointer px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs flex-1 min-w-[100px]"
                            >
                              <option value="">Select meal timing</option>
                              <option value="Before meal">Before meal</option>
                              <option value="After meal">After meal</option>
                              <option value="With meal">With meal</option>
                              <option value="Empty stomach">
                                Empty stomach
                              </option>
                            </select>
                          </div>

                          {/* Timing fields */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">
                              Timing:
                            </label>
                            {editingMedication.timing.map((time, timeIndex) => (
                              <div
                                key={timeIndex}
                                className="flex items-center gap-1"
                              >
                                <input
                                  type="time"
                                  value={time}
                                  onChange={(e) =>
                                    updateTimingField(
                                      timeIndex,
                                      e.target.value,
                                      true
                                    )
                                  }
                                  className="px-2 py-1 bg-green-50 border border-green-200 rounded text-xs"
                                />
                                {editingMedication.timing.length > 1 && (
                                  <button
                                    onClick={() =>
                                      removeTimingField(timeIndex, true)
                                    }
                                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => addTimingField(true)}
                              className="cursor-pointer text-xs text-blue-600 hover:text-blue-800"
                            >
                              + Add time
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-2">
                              <Pill className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-800 text-sm">
                                {med.name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditMedication(index)}
                              className="cursor-pointer p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Edit medication"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMedication(index)}
                              className="cursor-pointer p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Delete medication"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="ml-10 flex flex-wrap gap-2">
                          <div className="flex items-center px-2 py-1 bg-purple-50 rounded text-xs">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></div>
                            <span className="text-purple-700 font-medium mr-1">
                              Dosage:
                            </span>
                            <span className="text-purple-900 font-semibold">
                              {med.dosage} Mg
                            </span>
                          </div>

                          <div className="flex items-center px-2 py-1 bg-blue-50 rounded text-xs">
                            <RotateCcw className="w-3 h-3 text-blue-600 mr-1.5" />
                            <span className="text-blue-700 font-medium mr-1">
                              Freq:
                            </span>
                            <span className="text-blue-900 font-semibold">
                              {med.frequency}
                            </span>
                          </div>

                          <div className="flex items-center px-2 py-1 bg-green-50 rounded text-xs">
                            <Clock className="w-3 h-3 text-green-600 mr-1.5" />
                            <span className="text-green-700 font-medium mr-1">
                              Time:
                            </span>
                            <span className="text-green-900 font-semibold">
                              {Array.isArray(med.timing)
                                ? med.timing.join(", ")
                                : med.timing}
                            </span>
                          </div>

                          {med.beforeAfterMeal && (
                            <div className="flex items-center px-2 py-1 bg-orange-50 rounded text-xs">
                              <Utensils className="w-3 h-3 text-orange-600 mr-1.5" />
                              <span className="text-orange-700 font-medium mr-1">
                                Take:
                              </span>
                              <span className="text-orange-900 font-semibold">
                                {med.beforeAfterMeal}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No medications recorded</p>
                <button
                  onClick={() => setShowAddMedication(true)}
                  className="cursor-pointer mt-4 flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 hover:scale-110 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg mx-auto"
                  title="Add your first medication"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Add Medication Modal */}
            {showAddMedication && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Add New Medication
                    </h3>
                    <button
                      onClick={() => setShowAddMedication(false)}
                      className="cursor-pointer p-1 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medication Name *
                      </label>
                      <input
                        type="text"
                        value={newMedication.name}
                        onChange={(e) =>
                          setNewMedication((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter medication name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dosage (in Mg) *
                      </label>
                      <input
                        type="text"
                        value={newMedication.dosage}
                        onChange={(e) =>
                          setNewMedication((prev) => ({
                            ...prev,
                            dosage: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency *
                      </label>
                      <input
                        type="text"
                        value={newMedication.frequency}
                        onChange={(e) =>
                          setNewMedication((prev) => ({
                            ...prev,
                            frequency: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Twice daily"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timing *
                      </label>
                      {newMedication.timing.map((time, timeIndex) => (
                        <div
                          key={timeIndex}
                          className="flex items-center gap-2 mb-2"
                        >
                          <input
                            type="time"
                            value={time}
                            onChange={(e) =>
                              updateTimingField(timeIndex, e.target.value)
                            }
                            className="cursor-pointer flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {newMedication.timing.length > 1 && (
                            <button
                              onClick={() => removeTimingField(timeIndex)}
                              className="p-2 text-red-500 hover:bg-red-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addTimingField()}
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add another time
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meal Timing
                      </label>
                      <select
                        value={newMedication.beforeAfterMeal}
                        onChange={(e) =>
                          setNewMedication((prev) => ({
                            ...prev,
                            beforeAfterMeal: e.target.value,
                          }))
                        }
                        className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select meal timing</option>
                        <option value="Before meal">Before meal</option>
                        <option value="After meal">After meal</option>
                        <option value="With meal">With meal</option>
                        <option value="Empty stomach">Empty stomach</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={handleAddMedication}
                      className="cursor-pointer flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Add Medication
                    </button>
                    <button
                      onClick={() => setShowAddMedication(false)}
                      className="cursor-pointer flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {showDeleteAlert && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Delete Medication
                    </h3>
                  </div>
                </div>

                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this medication? This action
                  cannot be undone.
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={handleConfirmDelete}
                    className="cursor-pointer flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteAlert(false);
                      setMedicationToDelete(null);
                    }}
                    className="cursor-pointer flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Active Reminder Notifications */}
          {activeReminders
            .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp descending (latest first)
            .map((reminder, index) => (
              <div
                key={reminder.id}
                className="fixed right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-pulse"
                style={{ top: `${16 + index * 200}px` }} // Stack reminders vertically with 120px gap
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold flex items-center">
                    <Bell className="w-4 h-4 mr-2" />
                    Medication Reminder
                  </h4>
                  <button
                    onClick={() => handleReminderDismiss(reminder.id)}
                    className="cursor-pointer text-white hover:text-red-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{reminder.medication.name}</p>
                  <p>Dosage: {reminder.medication.dosage} Mg</p>
                  <p>Time: {reminder.time}</p>
                  {reminder.medication.beforeAfterMeal && (
                    <p>Take: {reminder.medication.beforeAfterMeal}</p>
                  )}
                </div>
                <button
                  onClick={() => handleReminderAcknowledge(reminder.id)}
                  className="cursor-pointer mt-3 w-full bg-white text-red-500 py-1 px-3 rounded font-medium hover:bg-gray-100 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            ))}

          {/* Reminder History Modal */}
          {showReminderHistory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-green-500" />
                    Reminder History (Last 1 Hour)
                  </h3>
                  <button
                    onClick={() => setShowReminderHistory(false)}
                    className="cursor-pointer p-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {reminderHistory.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {reminderHistory
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg border ${
                            item.status === "acknowledged"
                              ? "bg-green-50 border-green-200"
                              : "bg-yellow-50 border-yellow-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {item.medication.name}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  item.status === "acknowledged"
                                    ? "bg-green-100 text-green-800"
                                    : item.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {item.status === "acknowledged"
                                  ? "Taken"
                                  : item.status === "pending"
                                  ? "Pending"
                                  : "Active"}
                              </span>
                              {item.status === "pending" && (
                                <button
                                  onClick={() =>
                                    handleReminderAcknowledge(item.id)
                                  }
                                  className="cursor-pointer text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                >
                                  ✓ Done
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p>Dosage: {item.medication.dosage} Mg</p>
                            <p>Scheduled: {item.time}</p>
                            <p>
                              Reminded:{" "}
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </p>
                            {item.acknowledgedAt && (
                              <p>
                                Acknowledged:{" "}
                                {new Date(
                                  item.acknowledgedAt
                                ).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      No reminders in the last hour
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setShowReminderHistory(false)}
                  className="cursor-pointer w-full mt-4 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {showNotificationPermission && (
            <NotificationPermission
              userId={userData.userId} // Make sure you have userId available
              onClose={handleNotificationPermission}
            />
          )}
        </div>

        {/* Your Care Team - Now moved below the bottom grid */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-indigo-500" />
            Your Care Team
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userData.caregivers.map((caregiver, index) => (
              <div
                key={index}
                className="flex items-center p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{caregiver.name}</p>
                  <div className="flex flex-col mt-1 space-y-1">
                    <div className="flex items-center text-xs text-gray-500">
                      <Mail className="w-3 h-3 mr-1" />
                      {caregiver.email}
                    </div>
                    {caregiver.phone && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Phone className="w-3 h-3 mr-1" />
                        {caregiver.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
