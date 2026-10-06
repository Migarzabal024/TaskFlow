const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 Bienvenido a TaskFlow");
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

module.exports = app;
