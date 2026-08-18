import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { start, stop, getBotStatus } from "./artifacts/wa-bot/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

let status = "OFFLINE";

app.use(express.json());
app.use(express.static("public"));

app.post("/api/start", async (req, res) => {
  try {
    await start();

    console.log("▶️ Bot started from dashboard");

    res.json({
      success: true,
      message: "Bot starting...",
    });
  } catch (error) {
    console.error("Start bot error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/stop", async (req, res) => {
  try {
    await stop();

    console.log("⏹️ Bot stopped from dashboard");

    res.json({
      success: true,
      message: "Bot stopped",
    });
  } catch (error) {
    console.error("Stop bot error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/status", (req, res) => {
  res.json(getBotStatus());
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running on port ${PORT}`);
});
