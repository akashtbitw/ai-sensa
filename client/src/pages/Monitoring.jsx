// client/src/pages/Monitor.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  HeartPulse,
  Activity,
  Droplets,
  PersonStanding,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";

function Monitoring() {
  const { user } = useUser();
  const [simulations, setSimulations] = useState({
    heartRate: false,
    bloodPressure: false,
    spo2: false,
    fallDetection: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [responseInfo, setResponseInfo] = useState(null);
  const [deleting, setDeleting] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // API URL from environment variables
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    if (user?.id) {
      fetchActiveSimulations();
    }
  }, [user?.id]);

  async function fetchActiveSimulations() {
    try {
      if (!user?.id) return;

      setLoading(true);
      setError(null);
      setResponseInfo(null);

      // The full URL we're fetching from
      const url = `${API_URL}/api/simulation/active/${user?.id}`;
      console.log("Fetching from URL:", url);

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

      setSimulations(
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

  // Function to initiate delete confirmation
  function handleDeleteClick(simulationType) {
    setConfirmDelete(simulationType);
    setDeleteConfirmText(""); // Reset confirmation text
  }

  // Function to cancel delete operation
  function cancelDelete() {
    setConfirmDelete(null);
    setDeleteConfirmText(""); // Reset confirmation text
  }

  // Function to handle confirmation text change
  function handleConfirmTextChange(e) {
    setDeleteConfirmText(e.target.value);
  }

  // Function to actually delete data after confirmation
  async function confirmDeleteData() {
    const simulationType = confirmDelete;
    setConfirmDelete(null); // Close the confirmation dialog
    setDeleteConfirmText(""); // Reset confirmation text

    try {
      if (!user?.id) return;

      // Set deleting state for this simulation type
      setDeleting((prev) => ({ ...prev, [simulationType]: true }));
      setError(null);
      setSuccess(null);

      const url = `${API_URL}/api/simulation/data/${user?.id}/${simulationType}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Failed to delete ${simulationType} data`
        );
      }

      setSuccess(
        `Successfully deleted ${data.deletedCount} ${simulationType} records`
      );

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error(`Error deleting ${simulationType} data:`, err);
      setError(err.message || `Failed to delete ${simulationType} data`);
    } finally {
      setDeleting((prev) => ({ ...prev, [simulationType]: false }));
    }
  }

  // Function to get readable name for simulation type
  function getReadableName(type) {
    switch (type) {
      case "heart-rate":
        return "Heart Rate";
      case "blood-pressure":
        return "Blood Pressure";
      case "spo2":
        return "Oxygen Saturation";
      case "fall-detection":
        return "Fall Detection";
      default:
        return type;
    }
  }

  // Card component for each type of monitoring
  const MonitoringCard = ({ title, icon, active, type }) => {
    const Icon = icon;
    const isDeleting = deleting[type] || false;

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <div
            className={`p-3 rounded-full mr-4 ${
              active ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <Icon
              size={24}
              className={active ? "text-blue-600" : "text-gray-500"}
            />
          </div>
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              active
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </span>
          <div className="flex items-center space-x-3">
            <Link
              to={`/view-data/${type}`}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              View Data
            </Link>
            <button
              onClick={() => handleDeleteClick(type)}
              disabled={isDeleting}
              className={`flex items-center cursor-pointer text-sm font-medium ${
                isDeleting
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-red-500 hover:text-red-700"
              }`}
              title="Delete all data"
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-1" />
                  Delete Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600 flex items-center">
                <AlertTriangle className="mr-2" size={20} />
                Confirm Deletion
              </h3>
              <button
                onClick={cancelDelete}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-red-700">
                  <strong>Warning:</strong> You are about to permanently delete
                  all {getReadableName(confirmDelete)} data. This action cannot
                  be undone.
                </p>
              </div>

              <p className="mb-4">
                To confirm deletion, please type <strong>"delete"</strong> in
                the field below:
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={handleConfirmTextChange}
                placeholder="Type 'delete' to confirm"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteData}
                disabled={deleteConfirmText !== "delete"}
                className={`px-4 py-2 rounded flex items-center ${
                  deleteConfirmText === "delete"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-300 text-white cursor-not-allowed"
                }`}
              >
                <Trash2 size={16} className="mr-2" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Health Monitoring</h1>
        <button
          onClick={fetchActiveSimulations}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg cursor-pointer text-sm flex items-center"
        >
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Status
        </button>
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-md p-6 animate-pulse"
            >
              <div className="flex items-center mb-4">
                <div className="bg-gray-200 p-3 rounded-full mr-4 w-10 h-10"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MonitoringCard
            title="Heart Rate"
            icon={HeartPulse}
            active={simulations.heartRate}
            type="heart-rate"
          />
          <MonitoringCard
            title="Blood Pressure"
            icon={Activity}
            active={simulations.bloodPressure}
            type="blood-pressure"
          />
          <MonitoringCard
            title="Oxygen Saturation"
            icon={Droplets}
            active={simulations.spo2}
            type="spo2"
          />
          <MonitoringCard
            title="Fall Detection"
            icon={PersonStanding}
            active={simulations.fallDetection}
            type="fall-detection"
          />
        </div>
      )}
    </div>
  );
}

export default Monitoring;
