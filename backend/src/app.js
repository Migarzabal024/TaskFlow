const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const familyRoutes = require("./routes/familyRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const taskRoutes = require("./routes/taskRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { corsOrigin } = require("./config/env");

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 Bienvenido a TaskFlow");
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/statistics", statisticsRoutes);

app.use("/api", notFoundHandler);
app.use(errorHandler);

module.exports = app;
