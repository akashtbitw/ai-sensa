// client/src/pages/ViewData.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  HeartPulse,
  Activity,
  Droplets,
  PersonStanding,
  Clock,
  Download,
} from "lucide-react";

function ViewData() {
  const { dataType } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentValue, setCurrentValue] = useState(null);
  const [responseInfo, setResponseInfo] = useState(null);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const pollingInterval = useRef(null);

  const [timeFilter, setTimeFilter] = useState("live"); // Options: live, latest, 1hr, 5hr, custom
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false);
  const [customRangeError, setCustomRangeError] = useState(null);
  const [isAutoUpdatePaused, setIsAutoUpdatePaused] = useState(false);

  // API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || "";

  // Configuration for different data types
  const dataTypeConfig = {
    "heart-rate": {
      title: "Heart Rate",
      icon: HeartPulse,
      color: "#f43f5e", // rose-500
      unit: "BPM",
      dataKey: "bpm",
      normalRange: { min: 60, max: 100 },
      yAxisDomain: [40, 180],
    },
    "blood-pressure": {
      title: "Blood Pressure",
      icon: Activity,
      color: "#8b5cf6", // violet-500
      unit: "mmHg",
      dataKey: ["systolic", "diastolic"],
      normalRange: {
        systolic: { min: 90, max: 120 },
        diastolic: { min: 60, max: 80 },
      },
      yAxisDomain: [40, 180],
    },
    spo2: {
      title: "Oxygen Saturation",
      icon: Droplets,
      color: "#3b82f6", // blue-500
      unit: "%",
      dataKey: "level", // Changed from percentage to level to match the model
      normalRange: { min: 95, max: 100 },
      yAxisDomain: [80, 100],
    },
    "fall-detection": {
      title: "Fall Detection",
      icon: PersonStanding,
      color: "#ef4444", // red-500
      unit: "severity",
      dataKey: "severity",
      severityColors: {
        low: "#ffc107", // amber
        medium: "#ff9800", // orange
        high: "#f44336", // red
      },
      yAxisDomain: [0, 3], // Changed to accommodate severity levels
    },
  };

  // Get the configuration for the current data type
  const config = dataTypeConfig[dataType] || {};
  const Icon = config.icon;

  useEffect(() => {
    // Don't fetch on initial render or for custom range (which needs manual apply)
    if (timeFilter === "custom") return;

    // Fetch data whenever the time filter changes (except custom which has its own apply button)
    fetchData();
  }, [timeFilter]);

  // Check if the simulation is active
  useEffect(() => {
    if (user?.id && dataType) {
      checkSimulationStatus();
    }
  }, [dataType, user?.id]);

  // Set up or clear polling based on simulation status
  useEffect(() => {
    // Clear any existing polling interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    // Initial data fetch regardless of simulation status
    fetchData();

    // Only set up polling if simulation is active AND viewing live data AND not paused
    if (isSimulationActive && timeFilter === "live" && !isAutoUpdatePaused) {
      pollingInterval.current = setInterval(fetchData, 10000);
      console.log("Setting up polling interval for live data");
    }

    // Clean up interval on unmount or filter change
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [isSimulationActive, timeFilter, isAutoUpdatePaused, dataType, user?.id]);

  function convertToCSV(data) {
    if (!data || data.length === 0) return "";

    // Define headers based on data type
    let headers = ["timestamp"];
    let rows = [];

    if (dataType === "blood-pressure") {
      headers = [...headers, "systolic", "diastolic"];
      rows = data.map((item) => [
        item.timestamp,
        item.systolic,
        item.diastolic,
      ]);
    } else if (dataType === "fall-detection") {
      headers = [...headers, "severity", "location"];
      rows = data.map((item) => [
        item.timestamp,
        item.severity,
        item.location || "Unknown",
      ]);
    } else {
      // For heart-rate and spo2
      const dataKey = config.dataKey;
      headers = [...headers, dataKey];
      rows = data.map((item) => [item.timestamp, item[dataKey]]);
    }

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell
          )
          .join(",")
      ),
    ].join("\n");

    return csvContent;
  }

  // Add this function after convertToCSV
  function downloadCSV() {
    if (!data || data.length === 0) {
      alert("No data available to download");
      return;
    }

    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    // Create filename with timestamp and time range
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, "-");
    const timeRangeText =
      timeFilter === "custom"
        ? `${customStartTime.replace(/:/g, "-")}_to_${customEndTime.replace(
            /:/g,
            "-"
          )}`
        : timeFilter;

    const filename = `${dataType}_data_${timeRangeText}_${timestamp}.csv`;

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  async function checkSimulationStatus() {
    try {
      if (!user?.id) return;

      // The full URL we're fetching from
      const url = `${API_URL}/api/simulation/active/${user?.id}`;
      console.log("Checking simulation status from URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error("Invalid JSON response from server");
      }

      // Map the simulation type to the corresponding key in the response
      const simulationTypeMap = {
        "heart-rate": "heartRate",
        "blood-pressure": "bloodPressure",
        spo2: "spo2",
        "fall-detection": "fallDetection",
      };

      const activeKey = simulationTypeMap[dataType];
      const active =
        activeKey && data.activeSimulations
          ? data.activeSimulations[activeKey]
          : false;

      console.log(`Simulation ${dataType} active status:`, active);
      setIsSimulationActive(active);
      setTimeFilter(active ? "live" : "latest");
      return active;
    } catch (err) {
      console.error("Error checking simulation status:", err);
      // Default to inactive if there's an error
      setIsSimulationActive(false);
      setTimeFilter("latest");

      return false;
    }
  }

  function getTimeFilterParams() {
    const now = new Date();

    switch (timeFilter) {
      case "live":
      case "latest":
        // For live/latest, just get the latest records without time restrictions
        return {
          limit: 50,
          // No time restrictions - let the server return the most recent data
        };
      case "1hr":
        // Create a proper 1-hour window
        const oneHourAgo = new Date(now);
        oneHourAgo.setHours(now.getHours() - 1);
        return {
          startDate: oneHourAgo.toISOString(),
          endDate: now.toISOString(),
        };
      case "5hr":
        // Create a proper 5-hour window
        const fiveHoursAgo = new Date(now);
        fiveHoursAgo.setHours(now.getHours() - 5);
        return {
          startDate: fiveHoursAgo.toISOString(),
          endDate: now.toISOString(),
        };
      case "custom":
        // Validate custom dates
        if (!customStartTime || !customEndTime) {
          setCustomRangeError("Please select both start and end times");
          return null;
        }

        const startDate = new Date(customStartTime);
        const endDate = new Date(customEndTime);

        // Ensure custom range is valid
        if (startDate > endDate) {
          setCustomRangeError("Start time must be before end time");
          return null;
        }

        const timeDiff = endDate.getTime() - startDate.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff > 24) {
          setCustomRangeError("Custom time range cannot exceed 24 hours");
          return null;
        }

        // Clear any existing error if validation passes
        setCustomRangeError(null);
        return {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
      default:
        return { limit: 50 };
    }
  }

  async function fetchData() {
    try {
      if (!user?.id) return;

      setLoading(true); // Add loading state when fetching
      setError(null);
      setResponseInfo(null);

      // Get time filter parameters
      const timeParams = getTimeFilterParams();

      // If custom range is invalid, stop processing
      if (timeFilter === "custom" && !timeParams) {
        setLoading(false);
        return;
      }

      // Build query string from parameters
      const queryParams = new URLSearchParams();
      if (timeParams.limit) queryParams.set("limit", timeParams.limit);
      if (timeParams.startDate)
        queryParams.set("startDate", timeParams.startDate);
      if (timeParams.endDate) queryParams.set("endDate", timeParams.endDate);

      // The full URL we're fetching from with query parameters
      const url = `${API_URL}/api/${dataType}/${
        user?.id
      }?${queryParams.toString()}`;
      console.log(`Fetching ${dataType} data from URL:`, url);

      const response = await fetch(url);

      // Capture the response content for debugging
      const responseText = await response.text();

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
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        setResponseInfo({
          url,
          status: response.status,
          statusText: response.statusText,
          preview: responseText.substring(0, 100) + "...",
        });
        throw new Error("Invalid JSON response from server");
      }

      // Process the data for chart display
      const processedData = responseData.map((item) => {
        // Process fall detection data
        if (dataType === "fall-detection") {
          return {
            time: new Date(item.timestamp).toLocaleTimeString(),
            ...item,
            // Convert severity to numeric value for the chart
            severityValue:
              item.severity === "low" ? 1 : item.severity === "medium" ? 2 : 3,
            timestamp: item.timestamp,
            location: item.location || "Unknown",
          };
        }

        return {
          time: new Date(item.timestamp).toLocaleTimeString(),
          ...item,
          timestamp: item.timestamp,
        };
      });

      setData(processedData);

      // Update current value from the latest reading
      if (processedData.length > 0) {
        const latestReading = processedData[processedData.length - 1];
        setCurrentValue(latestReading);
      }

      setLoading(false);
    } catch (err) {
      console.error(`Error fetching ${dataType} data:`, err);
      setError(err.message || `Failed to load ${dataType} data`);
      setLoading(false);
    }
  }

  function getOptimizedXAxisProps() {
    // For large datasets, adjust interval
    if (data.length > 100) {
      return {
        interval: Math.ceil(data.length / 15), // Show approximately 15 ticks
        angle: -45,
        textAnchor: "end",
        height: 70,
        fontSize: 10,
      };
    }

    return {
      interval: "preserveStartEnd",
      fontSize: 12,
    };
  }

  function handleTimeFilterChange(newFilter) {
    // First update the filter state
    setTimeFilter(newFilter);

    // If switching to 'live' mode, ensure auto-updates are enabled
    if (newFilter === "live") {
      setIsAutoUpdatePaused(false);
    }
    // If switching away from 'live' mode, pause auto-updates
    else if (timeFilter === "live") {
      setIsAutoUpdatePaused(true);
    }

    // Show/hide custom range picker
    setShowCustomRangePicker(newFilter === "custom");

    // Clear any existing custom range errors
    setCustomRangeError(null);
  }

  function renderTimeFilter() {
    // Get current time for setting max values on datetime inputs
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const maxDateTime = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    const minDateTime = twentyFourHoursAgo.toISOString().slice(0, 16);

    return (
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Clock size={18} className="mr-2 text-gray-600" />
              <h3 className="font-medium">Time Range</h3>
            </div>

            {/* Download CSV Button */}
            <button
              onClick={downloadCSV}
              disabled={!data || data.length === 0}
              className={`flex items-center px-3 py-1 rounded text-sm ${
                !data || data.length === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
              }`}
              title={`Download ${config.title} data as CSV`}
            >
              <Download size={14} className="mr-1" />
              Download CSV
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Only show Live option if simulation is active */}
            {isSimulationActive && (
              <button
                onClick={() => handleTimeFilterChange("live")}
                className={`px-3 py-1 rounded-full text-sm ${
                  timeFilter === "live"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                Live
              </button>
            )}

            {/* Always show Latest option */}
            {!isSimulationActive && (
              <button
                onClick={() => handleTimeFilterChange("latest")}
                className={`px-3 py-1 rounded-full text-sm ${
                  timeFilter === "latest"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                Latest
              </button>
            )}

            <button
              onClick={() => handleTimeFilterChange("1hr")}
              className={`px-3 py-1 rounded-full text-sm ${
                timeFilter === "1hr"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              Last 1 Hour
            </button>

            <button
              onClick={() => handleTimeFilterChange("5hr")}
              className={`px-3 py-1 rounded-full text-sm ${
                timeFilter === "5hr"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              Last 5 Hours
            </button>

            <button
              onClick={() => handleTimeFilterChange("custom")}
              className={`px-3 py-1 rounded-full text-sm ${
                timeFilter === "custom"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Custom range picker */}
          {showCustomRangePicker && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    className={`mt-1 block w-full border ${
                      customRangeError && !customStartTime
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm`}
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    min={minDateTime}
                    max={maxDateTime}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    className={`mt-1 block w-full border ${
                      customRangeError && !customEndTime
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm`}
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    min={minDateTime}
                    max={maxDateTime}
                  />
                </div>
              </div>

              {/* Display validation error if exists */}
              {customRangeError && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {customRangeError}
                  </div>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  onClick={fetchData}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-4 rounded text-sm cursor-pointer"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: Only 24 hours of historical data is available
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  function getValueColorClass(value, dataKey = config.dataKey) {
    if (!value) return "text-gray-500";

    // Handle fall detection specially
    if (dataType === "fall-detection") {
      const severity = value.severity;
      if (severity === "high") return "text-red-500";
      if (severity === "medium") return "text-orange-500";
      return "text-amber-500"; // low severity
    }

    // Handle blood pressure specially with independent checks
    if (dataType === "blood-pressure") {
      return "text-gray-800"; // Default neutral color for the combined value display
    }

    // Handle standard ranges
    if (config.normalRange) {
      const actualValue = typeof dataKey === "string" ? value[dataKey] : value;
      if (actualValue < config.normalRange.min) return "text-blue-500"; // Low
      if (actualValue > config.normalRange.max) return "text-red-500"; // High
      return "text-green-500"; // Normal
    }

    return "text-green-500"; // Default
  }

  // Function to get individual status color for systolic or diastolic values
  function getBloodPressureValueColor(value, type) {
    if (!value) return "text-gray-500";

    const range = config.normalRange[type];
    if (value < range.min) return "text-blue-500"; // Low
    if (value > range.max) return "text-red-500"; // High
    return "text-green-500"; // Normal
  }

  function getStatusForValue(value, key = null) {
    if (!value) return "No data";

    // Handle fall detection specially
    if (dataType === "fall-detection") {
      return `${
        value.severity.charAt(0).toUpperCase() + value.severity.slice(1)
      } Severity Fall`;
    }

    // Handle blood pressure specially
    if (dataType === "blood-pressure" && key) {
      const range = config.normalRange[key];
      if (value < range.min) return "Low";
      if (value > range.max) return "High";
      return "Normal";
    }

    // Handle standard ranges
    if (config.normalRange) {
      const actualValue =
        typeof config.dataKey === "string" ? value[config.dataKey] : value;
      if (actualValue < config.normalRange.min) return "Low";
      if (actualValue > config.normalRange.max) return "High";
      return "Normal";
    }

    return "Normal"; // Default
  }

  function renderCurrentValue() {
    if (!currentValue) {
      return <div className="text-gray-500">No data available</div>;
    }

    if (dataType === "blood-pressure") {
      return (
        <>
          <div className="text-4xl font-bold text-gray-800">
            {currentValue.systolic}/{currentValue.diastolic}{" "}
            <span className="text-sm">{config.unit}</span>
          </div>
          <div
            className={getBloodPressureValueColor(
              currentValue.systolic,
              "systolic"
            )}
          >
            Systolic: {getStatusForValue(currentValue.systolic, "systolic")}
          </div>
          <div
            className={getBloodPressureValueColor(
              currentValue.diastolic,
              "diastolic"
            )}
          >
            Diastolic: {getStatusForValue(currentValue.diastolic, "diastolic")}
          </div>
        </>
      );
    }

    if (dataType === "fall-detection") {
      return (
        <>
          <div
            className={`text-4xl font-bold ${getValueColorClass(currentValue)}`}
          >
            {currentValue.severity.toUpperCase()}
          </div>
          <div className={`text-sm mt-2 ${getValueColorClass(currentValue)}`}>
            {getStatusForValue(currentValue)}
          </div>
          <div className="text-sm text-gray-600">
            Location: {currentValue.location}
          </div>
        </>
      );
    }

    if (dataType === "spo2") {
      const value = currentValue[config.dataKey];
      return (
        <>
          <div
            className={`text-4xl font-bold ${getValueColorClass(currentValue)}`}
          >
            {value} <span className="text-sm">{config.unit}</span>
          </div>
          <div className={`text-sm mt-2 ${getValueColorClass(currentValue)}`}>
            {getStatusForValue(currentValue)}
          </div>
        </>
      );
    }

    const value = currentValue[config.dataKey];
    return (
      <>
        <div
          className={`text-4xl font-bold ${getValueColorClass(currentValue)}`}
        >
          {value} <span className="text-sm">{config.unit}</span>
        </div>
        <div className={`text-sm mt-2 ${getValueColorClass(currentValue)}`}>
          {getStatusForValue(currentValue)}
        </div>
      </>
    );
  }

  // Custom tooltip formatter to show min/max values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const dataKey = config.dataKey;

      if (dataType === "blood-pressure") {
        return (
          <div className="bg-white p-3 border rounded shadow-md">
            <p className="font-bold">{label}</p>
            <p className="text-red-500">
              Systolic: {dataPoint.systolic} {config.unit}
              {dataPoint.systolic < config.normalRange.systolic.min && " (Low)"}
              {dataPoint.systolic > config.normalRange.systolic.max &&
                " (High)"}
            </p>
            <p className="text-blue-500">
              Diastolic: {dataPoint.diastolic} {config.unit}
              {dataPoint.diastolic < config.normalRange.diastolic.min &&
                " (Low)"}
              {dataPoint.diastolic > config.normalRange.diastolic.max &&
                " (High)"}
            </p>
            <p className="text-gray-500 text-xs">
              Normal Range(Systolic): {config.normalRange.systolic.min}-
              {config.normalRange.systolic.max} {config.unit}
            </p>
            <p className="text-gray-500 text-xs">
              Normal Range(Diastolic): {config.normalRange.diastolic.min}-
              {config.normalRange.diastolic.max} {config.unit}
            </p>
          </div>
        );
      }

      if (dataType === "heart-rate") {
        const value = dataPoint[dataKey];
        return (
          <div className="bg-white p-3 border rounded shadow-md">
            <p className="font-bold">{label}</p>
            <p>
              {config.title}: {value} {config.unit}
              {value < config.normalRange.min && " (Low)"}
              {value > config.normalRange.max && " (High)"}
              {value >= config.normalRange.min &&
                value <= config.normalRange.max &&
                " (Normal)"}
            </p>
            <p className="text-gray-500 text-xs">
              Normal Range: {config.normalRange.min}-{config.normalRange.max}{" "}
              {config.unit}
            </p>
          </div>
        );
      }

      if (dataType === "spo2") {
        const value = dataPoint[dataKey];
        return (
          <div className="bg-white p-3 border rounded shadow-md">
            <p className="font-bold">{label}</p>
            <p>
              {config.title}: {value} {config.unit}
              {value < config.normalRange.min && " (Low)"}
              {value > config.normalRange.max && " (High)"}
              {value >= config.normalRange.min &&
                value <= config.normalRange.max &&
                " (Normal)"}
            </p>
            <p className="text-gray-500 text-xs">
              Normal Range: {config.normalRange.min}-{config.normalRange.max}{" "}
              {config.unit}
            </p>
          </div>
        );
      }

      if (dataType === "fall-detection") {
        return (
          <div className="bg-white p-3 border rounded shadow-md">
            <p className="font-bold">{label}</p>
            <p>Severity: {dataPoint.severity}</p>
            <p>Location: {dataPoint.location}</p>
          </div>
        );
      }

      return (
        <div className="bg-white p-3 border rounded shadow-md">
          <p className="font-bold">{label}</p>
          <p>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }

    return null;
  };

  function renderChart() {
    if (data.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">No data available yet.</div>
        </div>
      );
    }

    // Render specific chart based on data type
    if (dataType === "blood-pressure") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" {...getOptimizedXAxisProps()} />
            <YAxis
              domain={config.yAxisDomain}
              label={{
                value: config.unit,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="systolic"
              name="Systolic"
              stroke="#ef4444"
              activeDot={{ r: 6 }}
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="diastolic"
              name="Diastolic"
              stroke="#3b82f6"
              activeDot={{ r: 6 }}
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (dataType === "spo2") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" {...getOptimizedXAxisProps()} />
            <YAxis
              domain={config.yAxisDomain}
              label={{
                value: config.unit,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey={config.dataKey}
              name="Oxygen Saturation"
              stroke={config.color}
              fill={config.color}
              fillOpacity={0.2}
            />
            {/* Reference line for minimum normal SpO2 */}
            <Line
              type="monotone"
              dataKey={() => 95}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              strokeWidth={1}
              name="Min Normal"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (dataType === "fall-detection") {
      // Custom color scale function for severity
      const getBarColor = (entry) => {
        const severityColors = {
          low: "#ffc107", // amber
          medium: "#ff9800", // orange
          high: "#f44336", // red
        };
        return severityColors[entry.severity] || config.color;
      };

      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" {...getOptimizedXAxisProps()} />
            <YAxis
              domain={[0, 3]}
              ticks={[0, 1, 2, 3]}
              tickFormatter={(value) => {
                if (value === 0) return "";
                if (value === 1) return "Low";
                if (value === 2) return "Medium";
                return "High";
              }}
              label={{
                value: "Severity",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="severityValue"
              name="Fall Severity"
              fill={config.color}
              barSize={20}
              isAnimationActive={false}
              shape={(props) => {
                const { x, y, width, height, payload } = props;
                const fill = getBarColor(payload);
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fill}
                    radius={[2, 2, 0, 0]}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Default chart for heart rate and any other types
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" {...getOptimizedXAxisProps()} />
          <YAxis
            domain={config.yAxisDomain}
            label={{
              value: config.unit,
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey={config.dataKey}
            name={config.title}
            stroke={config.color}
            activeDot={{ r: 6 }}
            dot={false}
            strokeWidth={2}
          />
          {/* Reference lines for normal range if applicable */}
          {config.normalRange && (
            <>
              <Line
                type="monotone"
                dataKey={() => config.normalRange.min}
                stroke="#9ca3af"
                strokeDasharray="3 3"
                strokeWidth={1}
                name="Min Normal"
              />
              <Line
                type="monotone"
                dataKey={() => config.normalRange.max}
                stroke="#9ca3af"
                strokeDasharray="3 3"
                strokeWidth={1}
                name="Max Normal"
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        {Icon && (
          <div className="p-2 rounded-full bg-gray-100 mr-3">
            <Icon size={24} className="text-gray-700" />
          </div>
        )}
        <h1 className="text-2xl font-bold">{config.title} Monitor</h1>
        {!isSimulationActive && (
          <span className="ml-4 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
            Tracking Inactive
          </span>
        )}
      </div>

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
              onClick={fetchData}
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {!isSimulationActive && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Tracking is currently inactive. Data shown may be outdated and
                will not update automatically.
                <br />
                <a
                  href="/simulation"
                  className="font-medium underline text-yellow-700 hover:text-yellow-600"
                >
                  Go back to Simulation page
                </a>{" "}
                to activate the tracking.
              </p>
            </div>
          </div>
        </div>
      )}

      {renderTimeFilter()}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Current Value Card */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-2">Current {config.title}</h3>

          {loading && !currentValue ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <>
              {renderCurrentValue()}
              <div className="text-xs text-gray-500 mt-1">
                Last updated:{" "}
                {data.length > 0
                  ? new Date(
                      data[data.length - 1].timestamp
                    ).toLocaleTimeString()
                  : "Never"}
              </div>
              {isSimulationActive && (
                <div className="text-xs mt-1">
                  {timeFilter === "live" ? (
                    <span className="text-green-500">
                      Auto-updates every 10 seconds
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      Auto-update paused (not in live mode)
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-3">
          <h3 className="text-lg font-semibold mb-4">{config.title} History</h3>

          {loading && data.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-blue-500">Loading...</div>
            </div>
          ) : (
            <div className="h-64">{renderChart()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewData;
