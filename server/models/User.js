// server/models/User.js
const mongoose = require("mongoose");

const CaregiverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "", // Optional
    },
  },
  { _id: true }
);

const MedicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    timing: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one timing is required",
      },
    },
    dosage: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      required: true,
    },
    beforeAfterMeal: {
      type: String,
      enum: ["Before meal", "After meal", "With meal", "Empty stomach", ""],
      default: "",
    },
  },
  { _id: true }
);

const NotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "critical_health_condition",
        "health_report",
        "medication_reminder",
        "appointment_reminder",
        "emergency_alert",
      ],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "3d",
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true, // Add index for faster lookups
  },
  name: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  normalHeartRate: {
    type: Number,
    required: true,
  },
  normalBP: {
    type: String,
    required: true,
  },
  normalSpO2: {
    type: Number,
    required: true,
  },
  healthConditions: {
    type: [String],
    default: [],
  },
  medications: {
    type: [MedicationSchema],
    default: [],
  },
  caregivers: {
    type: [CaregiverSchema],
    default: [],
  },
  notifications: {
    type: [NotificationSchema],
    default: [],
  },
  onboardingCompleted: {
    type: Boolean,
    default: true,
  },
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
  },
  notificationsEnabled: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the 'updatedAt' field on save
UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add method to mark notification as read
UserSchema.methods.markNotificationAsRead = function (notificationId) {
  const notification = this.notifications.id(notificationId);
  if (notification && !notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Add method to get unread notifications count
UserSchema.methods.getUnreadNotificationsCount = function () {
  return this.notifications.filter((notification) => !notification.read).length;
};

// Add method to add new notification
UserSchema.methods.addNotification = function (title, body, type) {
  this.notifications.push({
    title,
    body,
    type,
    read: false,
    createdAt: new Date(),
  });
  return this.save();
};

module.exports = mongoose.model("User", UserSchema);
