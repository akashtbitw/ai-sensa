import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
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
} from "lucide-react";
import { PersonStanding, ExternalLink } from "lucide-react";
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
  const [notifications] = useState([
    {
      id: 1,
      type: "warning",
      message: "Heart rate slightly elevated",
      time: "10 mins ago",
    },
    {
      id: 2,
      type: "success",
      message: "Daily medication reminder completed",
      time: "2 hours ago",
    },
    {
      id: 3,
      type: "info",
      message: "Weekly health report ready",
      time: "1 day ago",
    },
  ]);

  // Mock user data - in real app, this would come from your API
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveVitals, setLiveVitals] = useState({
    heartRate: 75,
    bloodPressure: { systolic: 122, diastolic: 82 },
    spO2: 97,
    fallDetected: false,
    fallSeverity: null,
    fallLocation: null,
    lastFallTime: null,
    lastUpdated: new Date(),
  });

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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
            <div className="text-right">
              <div className="text-2xl font-mono text-gray-800">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-500">Live Time</div>
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
                const bloodPressureStatus = getBloodPressureStatus(
                  liveVitals.bloodPressure.systolic,
                  liveVitals.bloodPressure.diastolic
                );
                return (
                  <div
                    onClick={() => openVitalTracking("blood-pressure")}
                    className={`p-4 rounded-lg ${bloodPressureStatus.bg} border relative group cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-2 hover:border-green-300`}
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
                    <div className="text-2xl font-bold text-gray-900 transition-all duration-300 group-hover:text-green-700 group-hover:scale-110">
                      {liveVitals.bloodPressure.systolic || 0}/
                      {liveVitals.bloodPressure.diastolic || 0}
                    </div>
                    <div className="text-xs text-gray-500">mmHg</div>
                    <div
                      className={`text-xs mt-1 ${bloodPressureStatus.color} font-medium`}
                    >
                      {bloodPressureStatus.status}
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
                {userData.healthConditions &&
                  userData.healthConditions.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400 flex-shrink-0">
                      <div className="text-sm text-yellow-800 font-semibold mb-2">
                        Health Conditions:
                      </div>
                      <div className="text-sm text-yellow-700 leading-relaxed overflow-hidden">
                        <div className="line-clamp-2">
                          {userData.healthConditions.join(", ")}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-orange-500" />
                Recent Notifications
              </h2>
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                {notifications.length} New
              </span>
            </div>

            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="mr-3 mt-0.5">
                    {notification.type === "warning" && (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    {notification.type === "success" && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    {notification.type === "info" && (
                      <Bell className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Caregivers */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-500" />
              Your Care Team
            </h2>

            <div className="max-h-64 overflow-y-auto space-y-4">
              {userData.caregivers.map((caregiver, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {caregiver.name}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
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
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Normal Vitals Reference */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-gray-600" />
            Your Normal Vital Signs Reference
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <HeartPulse className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Normal Heart Rate</div>
              <div className="font-semibold text-gray-800">
                {userData.normalHeartRate} BPM
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Activity className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Normal Blood Pressure</div>
              <div className="font-semibold text-gray-800">
                {userData.normalBP} mmHg
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Normal SpO2</div>
              <div className="font-semibold text-gray-800">
                {userData.normalSpO2}%
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <div className="text-sm text-gray-600">Profile Updated</div>
              <div className="font-semibold text-gray-800">Today</div>
            </div>
          </div>

          {userData.medications && userData.medications.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <h3 className="font-medium text-blue-800 mb-2">
                Current Medications
              </h3>
              <div className="space-y-1">
                {userData.medications.map((med, index) => (
                  <div key={index} className="text-sm text-blue-700">
                    {med.name} - {med.timing}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
