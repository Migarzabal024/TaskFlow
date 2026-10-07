const express = require("express");
const authRoutes = require("./routes/authRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 Bienvenido a TaskFlow");
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRoutes);

app.use("/api", notFoundHandler);
app.use(errorHandler);

module.exports = app;
