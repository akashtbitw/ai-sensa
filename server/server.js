// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");

// Routes
const heartRateRoutes = require("./routes/heartRate");
const bloodPressureRoutes = require("./routes/bloodPressure");
const spo2Routes = require("./routes/spo2");
const fallDetectionRoutes = require("./routes/fallDetection");
const simulationRoutes = require("./routes/simulation");
const userRoutes = require("./routes/users");
const { router: notificationRoutes } = require("./routes/notifications");
const aiRoutes = require("./routes/ai");
// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/heart-rate", heartRateRoutes);
app.use("/api/blood-pressure", bloodPressureRoutes);
app.use("/api/spo2", spo2Routes);
app.use("/api/fall-detection", fallDetectionRoutes);
app.use("/api/simulation", simulationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);

// Simple health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
