// client/src/pages/SimulationControl.js
import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";

function SimulationControl() {
  const { user } = useUser();
  const [activeSimulations, setActiveSimulations] = useState({
    heartRate: false,
    bloodPressure: false,
    spo2: false,
    fallDetection: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responseInfo, setResponseInfo] = useState(null);

  // Simulation config states
  const [heartRateConfig, setHeartRateConfig] = useState({
    baseHeartRate: 75,
    variance: 10,
    interval: 10,
  });

  const [bloodPressureConfig, setBloodPressureConfig] = useState({
    baseSystolic: 120,
    baseDiastolic: 80,
    variance: 10,
    interval: 10,
  });

  const [spo2Config, setSpo2Config] = useState({
    baseLevel: 97,
    variance: 2,
    interval: 15,
  });

  const [fallConfig, setFallConfig] = useState({
    probability: 5, // 5% chance of fall per check
    interval: 60, // check every 60 seconds
  });

  // API URL from environment variables - adjust this to match your actual API URL
  const API_URL = import.meta.env.VITE_API_URL || "";

  // Fetch active simulations on component mount
  useEffect(() => {
    if (user?.id) {
      fetchActiveSimulations();
    }
  }, [user?.id]);

  async function fetchActiveSimulations() {
    try {
      setLoading(true);
      setError(null);
      setResponseInfo(null);

      // The full URL we're fetching from
      const url = `${API_URL}/api/simulation/active/${user?.id}`;
      console.log("Fetching active simulations from:", url);

      const response = await fetch(url);
      console.log("Response status:", response.status);

      // Capture the response content for debugging
      const responseText = await response.text();
      console.log("Response content:", responseText.substring(0, 150) + "...");

      if (!response.ok) {
        setResponseInfo({
          url,
          status: response.status,
          statusText: response.statusText,
          preview: responseText.substring(0, 100) + "...",
        });
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        setResponseInfo({
          url,
          status: response.status,
          statusText: response.statusText,
          preview: responseText.substring(0, 100) + "...",
        });
        throw new Error("Invalid JSON response from server");
      }

      // Update the active simulations state based on returned data
      setActiveSimulations(
        data.activeSimulations || {
          heartRate: false,
          bloodPressure: false,
          spo2: false,
          fallDetection: false,
        }
      );
    } catch (err) {
      console.error("Error fetching active simulations:", err);
      setError(err.message || "Failed to load active simulations");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSimulation(simulationType) {
    const isActive = activeSimulations[simulationType];
    const action = isActive ? "stop" : "start";

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setResponseInfo(null);

      // Prepare config based on simulation type
      let config = {};
      switch (simulationType) {
        case "heartRate":
          config = {
            ...heartRateConfig,
            interval: parseInt(heartRateConfig.interval) * 1000, // Convert to ms
          };
          break;
        case "bloodPressure":
          config = {
            ...bloodPressureConfig,
            interval: parseInt(bloodPressureConfig.interval) * 1000,
          };
          break;
        case "spo2":
          config = {
            ...spo2Config,
            interval: parseInt(spo2Config.interval) * 1000,
          };
          break;
        case "fallDetection":
          config = {
            ...fallConfig,
            interval: parseInt(fallConfig.interval) * 1000,
          };
          break;
        default:
          break;
      }

      const url = `${API_URL}/api/simulation/${action}`;
      console.log(`${action}ing ${simulationType} simulation at:`, url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          simulationType,
          ...config,
        }),
      });

      // Capture the response content for debugging
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response content:", responseText.substring(0, 150) + "...");

      if (!response.ok) {
        setResponseInfo({
          url,
          status: response.status,
          statusText: response.statusText,
          preview: responseText.substring(0, 100) + "...",
        });

        // Try to parse the error message from JSON if possible
        let errorMsg = `Failed to ${action} simulation`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMsg = errorData.message;
          }
        } catch (e) {
          // If parsing fails, use the default message
        }

        throw new Error(errorMsg);
      }

      // Success!
      {
        action === "start" &&
          setSuccess(`${simulationType} simulation started successfully`);
      }
      {
        action === "stop" &&
          setSuccess(`${simulationType} simulation stopped successfully`);
      }

      setTimeout(() => {
        setSuccess(null);
      }, 3000);

      fetchActiveSimulations();
    } catch (err) {
      console.error(`Error ${action}ing simulation:`, err);
      setError(err.message || `Failed to ${action} simulation`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vitals Simulation Control</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>
            <strong>Error:</strong> {error}
          </p>

          {responseInfo && (
            <div className="mt-2 text-sm">
              <p>
                <strong>URL:</strong> {responseInfo.url}
              </p>
              <p>
                <strong>Status:</strong> {responseInfo.status}{" "}
                {responseInfo.statusText}
              </p>
              <p>
                <strong>Response Preview:</strong>
              </p>
              <div className="p-2 bg-gray-100 rounded mt-1 font-mono text-xs overflow-x-auto">
                {responseInfo.preview}
              </div>
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={fetchActiveSimulations}
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Heart Rate Simulation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Heart Rate Simulation</h2>
            <div className="relative inline-block w-12 align-middle select-none">
              <button
                onClick={() => toggleSimulation("heartRate")}
                disabled={loading}
                className={`${
                  activeSimulations.heartRate
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white py-2 px-4 cursor-pointer rounded-lg disabled:opacity-50`}
              >
                {activeSimulations.heartRate ? "Stop" : "Start"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Heart Rate (BPM)
              </label>
              <input
                type="number"
                value={heartRateConfig.baseHeartRate}
                onChange={(e) =>
                  setHeartRateConfig({
                    ...heartRateConfig,
                    baseHeartRate: e.target.value,
                  })
                }
                min="40"
                max="180"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variance (±BPM)
              </label>
              <input
                type="number"
                value={heartRateConfig.variance}
                onChange={(e) =>
                  setHeartRateConfig({
                    ...heartRateConfig,
                    variance: e.target.value,
                  })
                }
                min="1"
                max="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Interval (seconds)
              </label>
              <input
                type="number"
                value={heartRateConfig.interval}
                onChange={(e) =>
                  setHeartRateConfig({
                    ...heartRateConfig,
                    interval: e.target.value,
                  })
                }
                min="1"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {activeSimulations.heartRate && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm">
                ✓ Heart rate simulation is active
              </p>
            </div>
          )}
        </div>

        {/* Blood Pressure Simulation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Blood Pressure Simulation</h2>
            <div className="relative inline-block w-12 align-middle select-none">
              <button
                onClick={() => toggleSimulation("bloodPressure")}
                disabled={loading}
                className={`${
                  activeSimulations.bloodPressure
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white py-2 px-4 cursor-pointer rounded-lg disabled:opacity-50`}
              >
                {activeSimulations.bloodPressure ? "Stop" : "Start"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Systolic (mmHg)
              </label>
              <input
                type="number"
                value={bloodPressureConfig.baseSystolic}
                onChange={(e) =>
                  setBloodPressureConfig({
                    ...bloodPressureConfig,
                    baseSystolic: e.target.value,
                  })
                }
                min="90"
                max="180"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Diastolic (mmHg)
              </label>
              <input
                type="number"
                value={bloodPressureConfig.baseDiastolic}
                onChange={(e) =>
                  setBloodPressureConfig({
                    ...bloodPressureConfig,
                    baseDiastolic: e.target.value,
                  })
                }
                min="60"
                max="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variance (±mmHg)
              </label>
              <input
                type="number"
                value={bloodPressureConfig.variance}
                onChange={(e) =>
                  setBloodPressureConfig({
                    ...bloodPressureConfig,
                    variance: e.target.value,
                  })
                }
                min="1"
                max="15"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Interval (seconds)
              </label>
              <input
                type="number"
                value={bloodPressureConfig.interval}
                onChange={(e) =>
                  setBloodPressureConfig({
                    ...bloodPressureConfig,
                    interval: e.target.value,
                  })
                }
                min="5"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {activeSimulations.bloodPressure && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm">
                ✓ Blood pressure simulation is active
              </p>
            </div>
          )}
        </div>

        {/* SpO2 Simulation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">SpO2 Simulation</h2>
            <div className="relative inline-block w-12 align-middle select-none">
              <button
                onClick={() => toggleSimulation("spo2")}
                disabled={loading}
                className={`${
                  activeSimulations.spo2
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white py-2 px-4 cursor-pointer rounded-lg disabled:opacity-50`}
              >
                {activeSimulations.spo2 ? "Stop" : "Start"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base SpO2 Level (%)
              </label>
              <input
                type="number"
                value={spo2Config.baseLevel}
                onChange={(e) =>
                  setSpo2Config({
                    ...spo2Config,
                    baseLevel: e.target.value,
                  })
                }
                min="85"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variance (±%)
              </label>
              <input
                type="number"
                value={spo2Config.variance}
                onChange={(e) =>
                  setSpo2Config({
                    ...spo2Config,
                    variance: e.target.value,
                  })
                }
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reading Interval (seconds)
              </label>
              <input
                type="number"
                value={spo2Config.interval}
                onChange={(e) =>
                  setSpo2Config({
                    ...spo2Config,
                    interval: e.target.value,
                  })
                }
                min="5"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {activeSimulations.spo2 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm">
                ✓ SpO2 simulation is active
              </p>
            </div>
          )}
        </div>

        {/* Fall Detection Simulation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Fall Detection Simulation</h2>
            <div className="relative inline-block w-12 align-middle select-none">
              <button
                onClick={() => toggleSimulation("fallDetection")}
                disabled={loading}
                className={`${
                  activeSimulations.fallDetection
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                } text-white py-2 px-4 cursor-pointer rounded-lg disabled:opacity-50`}
              >
                {activeSimulations.fallDetection ? "Stop" : "Start"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fall Probability (%)
              </label>
              <input
                type="number"
                value={fallConfig.probability}
                onChange={(e) =>
                  setFallConfig({
                    ...fallConfig,
                    probability: e.target.value,
                  })
                }
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check Interval (seconds)
              </label>
              <input
                type="number"
                value={fallConfig.interval}
                onChange={(e) =>
                  setFallConfig({
                    ...fallConfig,
                    interval: e.target.value,
                  })
                }
                min="10"
                max="600"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {activeSimulations.fallDetection && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 text-sm">
                ✓ Fall detection simulation is active
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Active Simulations Overview */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Simulation Status</h2>

        {Object.values(activeSimulations).some(Boolean) ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(activeSimulations).map(([type, isActive]) => (
              <div
                key={type}
                className={`p-4 rounded-lg ${
                  isActive
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <h3 className="font-medium capitalize">
                  {type.replace(/([A-Z])/g, " $1").trim()}
                </h3>
                <p
                  className={`text-sm ${
                    isActive ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No active simulations.</p>
        )}
      </div>
    </div>
  );
}

export default SimulationControl;
