const express = require("express");
const webpush = require("web-push");
const User = require("../models/User");
const router = express.Router();

// Configure web-push (Add these to your .env file)
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:your-email@example.com",
  process.env.VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY",
  process.env.VAPID_PRIVATE_KEY || "YOUR_VAPID_PRIVATE_KEY"
);

// Get VAPID public key
router.get("/vapid-public-key", (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "YOUR_VAPID_PUBLIC_KEY",
  });
});

// Subscribe to push notifications
router.post("/subscribe", async (req, res) => {
  try {
    const { userId, subscription } = req.body;

    // Update user with subscription
    await User.findOneAndUpdate(userId, {
      pushSubscription: subscription,
      notificationsEnabled: true,
    });
    console.log("test");

    res.status(201).json({ message: "Subscription saved successfully" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", async (req, res) => {
  try {
    const { userId } = req.body;

    await User.findByIdAndUpdate(userId, {
      pushSubscription: null,
      notificationsEnabled: false,
    });

    res.status(200).json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Send notification (for testing or manual triggers)
router.post("/send", async (req, res) => {
  try {
    const { userId, title, body, data, tag } = req.body; // Accept tag from request

    const user = await User.findOne(userId);
    if (!user || !user.pushSubscription) {
      return res.status(404).json({ error: "User subscription not found" });
    }

    const payload = JSON.stringify({
      title,
      body,
      data,
      tag: tag, // Use the unique tag passed from client
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      requireInteraction: true, // Consider setting this to true for medication reminders
    });

    await webpush.sendNotification(user.pushSubscription, payload);
    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Get all notifications for a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sort notifications by creation date (newest first)
    const sortedNotifications = user.notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    return res.status(200).json({
      notifications: sortedNotifications,
      totalCount: user.notifications.length,
      unreadCount: user.getUnreadNotificationsCount(),
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Mark a specific notification as read
router.put("/:userId/:notificationId/read", async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notification = user.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await user.save();
    }

    return res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

// Mark all notifications as read for a user
router.put("/:userId/read-all", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Mark all unread notifications as read
    user.notifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
      }
    });

    await user.save();

    return res.status(200).json({
      message: "All notifications marked as read",
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: "Failed to update notifications" });
  }
});

// Delete a specific notification
router.delete("/:userId/:notificationId", async (req, res) => {
  try {
    const { userId, notificationId } = req.params;

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notification = user.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    user.notifications.pull(notificationId);
    await user.save();

    return res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({ message: "Failed to delete notification" });
  }
});

// Function to send medication reminder (can be called from other parts of your app)
const sendMedicationReminder = async (userId, medication, time) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscription || !user.notificationsEnabled) {
      return;
    }

    const payload = JSON.stringify({
      title: "💊 Medication Reminder",
      body: `Time to take ${medication.name} (${medication.dosage}mg)`,
      data: {
        type: "medication",
        medication: medication,
        time: time,
        url: "/dashboard",
      },
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      tag: `med-${medication.name}-${time}`,
      requireInteraction: true,
    });

    await webpush.sendNotification(user.pushSubscription, payload);
    console.log(`Medication reminder sent to user ${userId}`);
  } catch (error) {
    console.error("Error sending medication reminder:", error);
  }
};

module.exports = { router, sendMedicationReminder };
