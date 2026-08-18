import express from "express";
import { start, stop, getBotStatus } from "./artifacts/wa-bot/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ================================
// HEALTH CHECK
// ================================

app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// ================================
// START BOT
// ================================

app.post("/api/start", async (req, res) => {
  try {
    await start();

    console.log("▶️ Bot started from dashboard");

    res.json({
      success: true,
      message: "Bot starting...",
    });
  } catch (error) {
    console.error("❌ Start bot error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================================
// STOP BOT
// ================================

app.post("/api/stop", async (req, res) => {
  try {
    await stop();

    console.log("⏹️ Bot stopped from dashboard");

    res.json({
      success: true,
      message: "Bot stopped",
    });
  } catch (error) {
    console.error("❌ Stop bot error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================================
// BOT STATUS
// ================================

app.get("/api/status", (req, res) => {
  try {
    res.json(getBotStatus());
  } catch (error) {
    console.error("❌ Status error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ================================
// START SERVER
// ================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
  console.log(`❤️ Health check: /healthz`);
});
