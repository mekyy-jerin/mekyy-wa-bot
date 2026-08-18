import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "baileys";

import pino from "pino";
import qrcode from "qrcode";

import { handleMessage } from "./handler.js";
import { getSettings } from "./group-store.js";

// ═══════════════════════════════════════
// 🌐 EXPRESS / DASHBOARD
// ═══════════════════════════════════════

const app = express();

const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// Serve public folder
app.use(express.static(path.join(__dirname, "public")));

// ═══════════════════════════════════════
// 📁 STORAGE FOLDERS
// ═══════════════════════════════════════

const storagePath = path.join(__dirname, "storage");

const folders = [
  "revealed",
  "stickers/brat",
  "stickers/bratvid",
  "stickers/smeme",
  "stickers/normal",
  "upscaled",
];

for (const folder of folders) {
  fs.mkdirSync(path.join(storagePath, folder), {
    recursive: true,
  });
}

// ═══════════════════════════════════════
// 🤖 BOT VARIABLES
// ═══════════════════════════════════════

const logger = pino({
  level: "silent",
});

let sock = null;

let botRunning = false;

let botStatus = "stopped";

let stopping = false;

// Real bot start time
let botStartedAt = null;

// ═══════════════════════════════════════
// 📊 BOT STATISTICS
// ═══════════════════════════════════════

let botStats = {
  messages: 0,
  commands: 0,
  groups: 0,
};

// ═══════════════════════════════════════
// 📊 BOT STATUS
// ═══════════════════════════════════════

function getBotStatus() {
  return {
    running: botRunning,

    connected: botStatus === "connected",

    status: botStatus,

    startedAt: botStartedAt,

    uptime: botStartedAt ? Math.floor((Date.now() - botStartedAt) / 1000) : 0,

    stats: {
      messages: botStats.messages,
      commands: botStats.commands,
      groups: botStats.groups,
    },
  };
}

// ═══════════════════════════════════════
// ▶ START BOT
// ═══════════════════════════════════════

async function start() {
  // Jangan start dua kali
  if (botRunning) {
    console.log("⚠️ Bot already running.");
    return;
  }

  stopping = false;

  botRunning = true;

  botStatus = "starting";

  // Start real uptime timer
  botStartedAt = Date.now();

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const { version } = await fetchLatestBaileysVersion();

    console.log(`\n🤖 MEKYY BOT starting... (Baileys v${version.join(".")})\n`);

    sock = makeWASocket({
      version,

      auth: state,

      printQRInTerminal: true,

      logger,

      browser: ["Mekyy Bot", "Chrome", "1.0.0"],

      syncFullHistory: false,

      markOnlineOnConnect: true,

      generateHighQualityLinkPreview: false,
    });

    // ═══════════════════════════════
    // 🔐 SAVE LOGIN
    // ═══════════════════════════════

    sock.ev.on("creds.update", saveCreds);

    // ═══════════════════════════════
    // 🔌 CONNECTION STATUS
    // ═══════════════════════════════

    sock.ev.on(
      "connection.update",

      async ({ connection, lastDisconnect, qr }) => {
        // ─────────────────────────────
        // 📱 QR
        // ─────────────────────────────

        if (qr) {
          try {
            await qrcode.toFile("qr.png", qr, {
              scale: 8,
            });

            console.log("\n📱 QR code saved → qr.png\n");
          } catch (err) {
            console.error("QR error:", err.message);
          }
        }

        // ─────────────────────────────
        // ❌ CONNECTION CLOSED
        // ─────────────────────────────

        if (connection === "close") {
          const code = lastDisconnect?.error?.output?.statusCode;

          if (code === DisconnectReason.loggedOut) {
            botRunning = false;

            botStatus = "logged_out";

            botStartedAt = null;

            console.log("\n🚪 Logged out.\n");

            console.log("Delete the auth folder and restart to login again.\n");

            return;
          }

          if (!stopping) {
            console.log(`\n🔄 Disconnected (${code}). Reconnecting in 3s...\n`);

            botRunning = false;

            botStatus = "reconnecting";

            setTimeout(
              () => {
                if (!stopping) {
                  start().catch(console.error);
                }
              },

              3000,
            );
          }
        }

        // ─────────────────────────────
        // ✅ CONNECTED
        // ─────────────────────────────
        else if (connection === "open") {
          botRunning = true;

          botStatus = "connected";

          console.log("\n✅ Mekyy Bot connected to WhatsApp!\n");

          console.log("📋 Type .menu in WhatsApp to see all commands.\n");
        }
      },
    );

    // ═══════════════════════════════
    // 💬 INCOMING MESSAGES
    // ═══════════════════════════════

    sock.ev.on(
      "messages.upsert",

      async ({ messages, type }) => {
        if (type !== "notify") {
          return;
        }

        // Count incoming messages
        botStats.messages += messages.length;

        for (const msg of messages) {
          if (msg.key.fromMe) {
            continue;
          }

          try {
            // Count command messages
            const messageText =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption ||
              "";

            if (messageText.trim().startsWith(".")) {
              botStats.commands++;
            }

            await handleMessage(sock, msg);
          } catch (err) {
            console.error("Message handler error:", err);
          }
        }
      },
    );

    // ═══════════════════════════════
    // 👥 GROUP PARTICIPANTS
    // ═══════════════════════════════

    sock.ev.on(
      "group-participants.update",

      async ({ id: groupJid, participants, action }) => {
        try {
          // Count unique group events
          botStats.groups++;

          const settings = getSettings(groupJid);

          const meta = await sock.groupMetadata(groupJid);

          const groupName = meta.subject;

          const memberCount = meta.participants.length;

          for (const participant of participants) {
            const shortNum = participant.split("@")[0];

            // ═══════════════════════
            // 🤖 ANTIBOT
            // ═══════════════════════

            if (action === "add" && settings.antibot) {
              try {
                const isBotPattern =
                  /^(0|1234|00)/.test(shortNum) || shortNum.length < 6;

                if (isBotPattern) {
                  await sock.groupParticipantsUpdate(
                    groupJid,
                    [participant],
                    "remove",
                  );

                  await sock.sendMessage(groupJid, {
                    text:
                      `🤖 *AntiBot Alert!*\n\n` +
                      `@${shortNum} was removed (suspected bot).`,

                    mentions: [participant],
                  });

                  continue;
                }
              } catch {
                // Ignore remove errors
              }
            }

            // ═══════════════════════
            // 👋 WELCOME
            // ═══════════════════════

            if (action === "add" && settings.welcome) {
              const welcomeText = settings.welcomeMsg
                .replace("{user}", `@${shortNum}`)
                .replace("{group}", groupName);

              const text =
                `╔══════════════════════╗\n` +
                `║   👋  WELCOME!       ║\n` +
                `╚══════════════════════╝\n\n` +
                `${welcomeText}\n\n` +
                `👥 You are member #${memberCount}\n` +
                `📌 Group: *${groupName}*\n\n` +
                `_Type .rules to see group rules_`;

              await sock.sendMessage(groupJid, {
                text,

                mentions: [participant],
              });
            }

            // ═══════════════════════
            // 👋 GOODBYE
            // ═══════════════════════

            if (
              (action === "remove" || action === "leave") &&
              settings.goodbye
            ) {
              const goodbyeText = settings.goodbyeMsg
                .replace("{user}", `@${shortNum}`)
                .replace("{group}", groupName);

              await sock.sendMessage(groupJid, {
                text: `👋 *Goodbye!*\n\n` + goodbyeText,

                mentions: [participant],
              });
            }
          }
        } catch (err) {
          console.error("Group update error:", err.message);
        }
      },
    );

    // ═══════════════════════════════
    // 📵 ANTICALL
    // ═══════════════════════════════

    sock.ev.on(
      "call",

      async (calls) => {
        for (const call of calls) {
          try {
            const settings = getSettings(call.chatId || call.from);

            if (settings.anticall && call.status === "offer") {
              await sock.rejectCall(call.id, call.from);

              await sock.sendMessage(call.from, {
                text:
                  `📵 *AntiCall Active*\n\n` +
                  `Calls are not allowed here. ` +
                  `Please send a message instead.`,
              });
            }
          } catch (err) {
            console.error("AntiCall error:", err.message);
          }
        }
      },
    );
  } catch (error) {
    botRunning = false;

    botStatus = "error";

    botStartedAt = null;

    sock = null;

    console.error("❌ Failed to start bot:", error);

    throw error;
  }
}

// ═══════════════════════════════════════
// ⏹ STOP BOT
// ═══════════════════════════════════════

async function stop() {
  stopping = true;

  if (sock) {
    try {
      sock.end(undefined);
    } catch (err) {
      console.error("Stop error:", err.message);
    }

    sock = null;
  }

  botRunning = false;

  botStatus = "stopped";

  // Reset real uptime
  botStartedAt = null;

  console.log("\n🛑 Mekyy Bot stopped.\n");
}

// ═══════════════════════════════════════
// 📊 API — STATUS
// ═══════════════════════════════════════

app.get(
  "/api/status",

  (req, res) => {
    res.json(getBotStatus());
  },
);

// ═══════════════════════════════════════
// ▶ API — START
// ═══════════════════════════════════════

app.post(
  "/api/start",

  async (req, res) => {
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
  },
);

// ═══════════════════════════════════════
// ⏹ API — STOP
// ═══════════════════════════════════════

app.post(
  "/api/stop",

  async (req, res) => {
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
  },
);

// ═══════════════════════════════════════
// 📁 GALLERY API
// ═══════════════════════════════════════

function getFiles(folder) {
  const dir = path.join(storagePath, folder);

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)

    .filter((file) => !file.startsWith("."))

    .map((file) => ({
      name: file,

      url: `/storage/${folder}/${encodeURIComponent(file)}`,
    }))

    .reverse();
}

// ═══════════════════════════════
// SERVE STORAGE FILES
// ═══════════════════════════════

app.use("/storage", express.static(storagePath));

// ═══════════════════════════════
// REVEALED IMAGES
// ═══════════════════════════════

app.get(
  "/api/revealed",

  (req, res) => {
    res.json(getFiles("revealed"));
  },
);

// ═══════════════════════════════
// BRAT STICKERS
// ═══════════════════════════════

app.get(
  "/api/stickers/brat",

  (req, res) => {
    res.json(getFiles("stickers/brat"));
  },
);

// ═══════════════════════════════
// BRATVID STICKERS
// ═══════════════════════════════

app.get(
  "/api/stickers/bratvid",

  (req, res) => {
    res.json(getFiles("stickers/bratvid"));
  },
);

// ═══════════════════════════════
// SMEME STICKERS
// ═══════════════════════════════

app.get(
  "/api/stickers/smeme",

  (req, res) => {
    res.json(getFiles("stickers/smeme"));
  },
);

// ═══════════════════════════════
// NORMAL STICKERS
// ═══════════════════════════════

app.get(
  "/api/stickers/normal",

  (req, res) => {
    res.json(getFiles("stickers/normal"));
  },
);

// ═══════════════════════════════
// UPSCALED IMAGES
// ═══════════════════════════════

app.get(
  "/api/upscaled",

  (req, res) => {
    res.json(getFiles("upscaled"));
  },
);

// ═══════════════════════════════════════
// 🏠 DASHBOARD
// ═══════════════════════════════════════

app.get(
  "/",

  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  },
);

// ═══════════════════════════════════════
// 🌐 START WEB SERVER
// ═══════════════════════════════════════

app.listen(
  PORT,

  "0.0.0.0",

  () => {
    console.log(`\n🌐 Mekyy Dashboard running on port ${PORT}\n`);
  },
);

// ═══════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════

export { start, stop, getBotStatus };
