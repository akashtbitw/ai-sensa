import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

const NotificationPermission = ({ userId, onClose }) => {
  const API_URL = import.meta.env.VITE_API_URL || "";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const requestPermission = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Check if browser supports notifications
      if (!("Notification" in window)) {
        throw new Error("This browser does not support notifications");
      }

      // Check if service worker is supported
      if (!("serviceWorker" in navigator)) {
        throw new Error("This browser does not support service workers");
      }

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Notification permission denied");
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      // Get VAPID public key
      const vapidResponse = await fetch(
        `${API_URL}/api/notifications/vapid-public-key`
      );
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      // Send subscription to server
      await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          subscription,
        }),
      });

      onClose(true); // Close with success
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Enable Notifications
            </h3>
          </div>
          <button
            onClick={() => onClose(false)}
            className="cursor-pointer p-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Stay on top of your health with timely notifications for:
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Medication reminders
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Health check alerts
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              Important health updates
            </li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="cursor-pointer flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Setting up..." : "Enable Notifications"}
          </button>
          <button
            onClick={() => onClose(false)}
            className="cursor-pointer flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermission;
