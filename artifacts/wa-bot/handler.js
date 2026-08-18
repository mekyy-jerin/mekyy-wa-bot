import { downloadMediaMessage } from "baileys";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import { getMenu } from "./menu.js";
import { makeBratSticker } from "./sticker.js";
import { makeMemeImage } from "./meme.js";
import { makeQuoteCard } from "./qc.js";
import { getSettings, setSetting } from "./group-store.js";
import {
  hasActiveGame,
  checkAnswer,
  stopGame,
  startMath,
  startSusunkata,
  startTebakKata,
  startTebakBendera,
} from "./games.js";
import {
  REACTIONS,
  fetchReactionGif,
  downloadGif,
  getReactionMenu,
} from "./reactions.js";
import { downloadTikTok } from "./downloader.js";
import { makeIQCImage } from "./iqc.js";
import { makeFakeChat } from "./fake.js";

// ── State ──────────────────────────────────────────
const startTime = Date.now();
const afkList = new Map(); // sender → { reason, since, name }

// ── Check categories ──────────────────────────────
const CHECK_KATEGORI = [
  {
    label: "Introvert",
    emoji: "🪨",
    captions: [
      [0, 30, "Still functional in public."],
      [31, 60, "Prefers staying in but can socialise."],
      [61, 85, "WiFi > people. Period."],
      [86, 100, "Hermit mode: ACTIVATED. The door is a myth."],
    ],
  },
  {
    label: "Simp",
    emoji: "🥺",
    captions: [
      [0, 20, "Dignity still intact. Respect."],
      [21, 50, "A little simp energy but manageable."],
      [51, 80, "Bought someone's topup and got ghosted. Classic."],
      [81, 100, "Simp Lord. Would pay for someone who hates them."],
    ],
  },
  {
    label: "Rizz",
    emoji: "😏",
    captions: [
      [0, 20, "Zero rizz. Needs serious training."],
      [21, 50, "Some charm but still awkward at key moments."],
      [51, 80, "People like them but they don't even notice."],
      [81, 100, "Sigma rizz. Silence is their superpower."],
    ],
  },
  {
    label: "Toxic",
    emoji: "☠️",
    captions: [
      [0, 20, "Genuinely good person. Rare."],
      [21, 50, "A few red flags, but workable."],
      [51, 80, "Friends are tired. Just saying."],
      [81, 100, "Walking red flag parade. Everyone's fleeing."],
    ],
  },
  {
    label: "Clingy",
    emoji: "🧲",
    captions: [
      [0, 20, "Chill. Doesn't even double text."],
      [21, 50, "Double texts once in a while — okay."],
      [51, 80, "Triple texts in 2 minutes. Deep breath."],
      [81, 100, "5 min no reply = full drama arc. Relax."],
    ],
  },
  {
    label: "NPC",
    emoji: "🤖",
    captions: [
      [0, 20, "Main character energy confirmed."],
      [21, 50, "Has their moments but follows the crowd."],
      [51, 80, "Background character in their own story."],
      [81, 100, "Pure NPC. Repeating the same dialogue daily."],
    ],
  },
  {
    label: "Gay",
    emoji: "🌈",
    captions: [
      [0, 20, "Straight as a ruler."],
      [21, 50, "Vibes are there. Just saying."],
      [51, 80, "Friends already know. You're the last to find out."],
      [81, 100, "Own your arc. It's giving main character."],
    ],
  },
  {
    label: "Healthy",
    emoji: "💪",
    captions: [
      [0, 30, "Needs some improvement."],
      [31, 60, "Average. Can do better."],
      [61, 85, "Strong and healthy. Respect."],
      [86, 100, "Overpowered. Absolutely dominant 👑"],
    ],
  },
  {
    label: "Main Character",
    emoji: "🌟",
    captions: [
      [0, 20, "Extra in someone else's story."],
      [21, 50, "Has potential, not shining yet."],
      [51, 80, "Plot armor detected. Keep going."],
      [81, 100, "The universe rotates around you. Undeniable."],
    ],
  },
  {
    label: "Stress",
    emoji: "😤",
    captions: [
      [0, 20, "Calm as water. Peaceful vibes."],
      [21, 50, "Slight tension but holding it together."],
      [51, 80, "Head full but still standing. Respect."],
      [81, 100, "Max stress. World can wait — take a break, bro."],
    ],
  },
  {
    label: "Lucky",
    emoji: "🍀",
    captions: [
      [0, 20, "Luck? What luck."],
      [21, 50, "Occasional lucky breaks."],
      [51, 80, "Fortune smiles at you often."],
      [81, 100, "Born under a lucky star. Everything works out."],
    ],
  },
  {
    label: "Sussy",
    emoji: "📮",
    captions: [
      [0, 20, "Clear. 0 sus."],
      [21, 50, "Acting a little sus but maybe innocent."],
      [51, 80, "Very sus. Crewmates are watching."],
      [81, 100, "IMPOSTOR. Fully exposed."],
    ],
  },
];

// ── Helpers ────────────────────────────────────────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function formatDuration(ms) {
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400),
    h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60),
    s = t % 60;
  const parts = [];
  if (d) parts.push(`${d}`);
  if (h) parts.push(`${h}`);
  if (m) parts.push(`${m}`);
  if (s || !parts.length) parts.push(`${s}`);
  return parts.join(" ");
}

async function isAdmin(sock, jid, participant) {
  try {
    const meta = await sock.groupMetadata(jid);
    const p = meta.participants.find((x) => x.id === participant);
    return p?.admin === "admin" || p?.admin === "superadmin";
  } catch {
    return false;
  }
}

async function downloadMedia(msg) {
  return downloadMediaMessage(msg, "buffer", {});
}

// ─────────────────────────────────────
// 📁 STORAGE HELPERS
// ─────────────────────────────────────

const STORAGE = path.join(process.cwd(), "storage");

function ensureFolder(folder) {
  const dir = path.join(STORAGE, folder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "");
}

async function saveToStorage(buffer, folder, extension = "webp") {
  const dir = ensureFolder(folder);

  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const filePath = path.join(dir, safeFileName(filename));

  await fs.promises.writeFile(filePath, buffer);

  return filePath;
}

// ── Main handler ───────────────────────────────────
export async function handleMessage(sock, msg) {
  try {
    if (!msg.message) return;

    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith("@g.us");
    const sender = msg.key.participant || msg.key.remoteJid;
    const pushName = msg.pushName || "User";
    const mentionedJids =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quotedMsg =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      "";

    const send = (t) => sock.sendMessage(jid, { text: t });
    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const react = (e) =>
      sock.sendMessage(jid, { react: { text: e, key: msg.key } });

    // ── AFK: sender came back ──
    if (afkList.has(sender)) {
      const { since, name } = afkList.get(sender);
      const dur = formatDuration(Date.now() - since);
      afkList.delete(sender);
      const msgs = [
        `👋 Welcome back *${name}*! You were AFK for *${dur}*. Everything okay? 😄`,
        `🎉 *${name}* is back! Gone for *${dur}* — we thought you escaped! 😂`,
        `☀️ *${name}* returned after *${dur}*! Welcome back to reality~ 🌍`,
        `😎 Oh hey, *${name}* is back! AFK for *${dur}* — pretty long huh!`,
        `🔔 *${name}* is online again after *${dur}*! We missed you! 💙`,
      ];
      await send(rand(msgs));
    }

    // ── AFK: mentioned user is AFK ──
    for (const mj of mentionedJids) {
      if (afkList.has(mj)) {
        const { reason, since, name } = afkList.get(mj);
        await send(
          `💤 *${name}* is currently AFK!\n\nReason: ${reason}\nGone for: *${formatDuration(Date.now() - since)}*`,
        );
      }
    }

    // ── Game answer check ──
    if (hasActiveGame(jid) && text && !text.startsWith(".")) {
      const result = checkAnswer(jid, text);
      if (result?.correct) {
        await react("✅");
        return reply(
          `✅ *CORRECT!* 🎉\n\nAnswer: *${result.answer}*\nTime: *${result.time}s*\n\nWell done, ${pushName}!`,
        );
      }
    }

    if (!text.startsWith(".")) return;

    const args = text.trim().slice(1).split(" ");
    const cmd = args[0].toLowerCase();
    const body = args.slice(1).join(" ");

    // ── Reaction commands (dynamic) ──
    if (REACTIONS[cmd]) {
      const target = mentionedJids[0]
        ? `@${mentionedJids[0].split("@")[0]}`
        : body || "everyone";
      const { emoji, label } = REACTIONS[cmd];
      await react(emoji);
      try {
        const gifUrl = await fetchReactionGif(cmd);
        if (gifUrl) {
          const gifBuf = await downloadGif(gifUrl);
          return sock.sendMessage(
            jid,
            {
              video: gifBuf,
              gifPlayback: true,
              caption: `${emoji} *${pushName}* ${label} *${target}*!`,
            },
            { quoted: msg },
          );
        }
      } catch (err) {
        console.error("Reaction GIF error:", err.message);
      }
      return reply(`${emoji} *${pushName}* ${label} *${target}*!`);
    }

    switch (cmd) {
      // ───────── GENERAL ─────────
      case "menu":
      case "help":
        await react("📋");
        return reply(getMenu());

      case "ping": {
        const lat = Math.abs(Date.now() - msg.messageTimestamp * 1000);
        return reply(`🏓 *Pong!*\nLatency: *${lat}ms*`);
      }

      case "bot": {
        const u = Math.floor((Date.now() - startTime) / 1000);
        return reply(
          `╔══════════════════╗\n` +
            `║   🤖 MEKYY BOT   ║\n` +
            `╚══════════════════╝\n\n` +
            `• Status : Online ✅\n` +
            `• Uptime : ${Math.floor(u / 3600)}h ${Math.floor((u % 3600) / 60)}m ${u % 60}s\n` +
            `• Prefix : . (dot)\n` +
            `• Platform: Baileys v7`,
        );
      }

      case "stats": {
        const u = Math.floor((Date.now() - startTime) / 1000);
        return reply(
          `📊 *Bot Stats*\n\n• Uptime: ${u}s\n• Name: ${pushName}\n• Group: ${isGroup ? "Yes" : "No"}`,
        );
      }

      // ───────── STICKER ─────────
      case "s":
      case "sticker": {
        const hasImg = !!msg.message?.imageMessage;
        const hasVid = !!msg.message?.videoMessage;
        const hasQImg = !!(
          quotedMsg?.imageMessage || quotedMsg?.stickerMessage
        );

        if (!hasImg && !hasVid && !hasQImg)
          return reply(
            "📎 *How to use:*\n\n1. Send image + caption *.s*\n2. Reply to any image with *.s*",
          );

        await react("⏳");
        try {
          let targetMsg = msg;
          if (!hasImg && !hasVid && hasQImg) {
            const ctx2 = msg.message.extendedTextMessage.contextInfo;
            targetMsg = {
              key: { remoteJid: jid, id: ctx2.stanzaId, fromMe: false },
              message: quotedMsg,
            };
          }
          const buf = await downloadMedia(targetMsg);
          const webp = await sharp(buf)
            .resize(512, 512, {
              fit: "contain",
              background: { r: 255, g: 255, b: 255, alpha: 0 },
            })
            .webp({ quality: 90 })
            .toBuffer();
          await saveToStorage(webp, "stickers/normal", "webp");

          await react("✅");

          return sock.sendMessage(jid, { sticker: webp }, { quoted: msg });
        } catch (err) {
          console.error("Sticker error:", err.message);
          await react("❌");
          return reply("❌ Failed to create sticker. Try again.");
        }
      }

      case "brat": {
        if (!body) return reply("Example: .brat your text here");
        await react("🧃");
        try {
          const buf = await makeBratSticker(body);

          await saveToStorage(buf, "stickers/brat", "webp");

          return sock.sendMessage(jid, { sticker: buf }, { quoted: msg });
        } catch (err) {
          return reply(`🧃 *BRAT*\n\n${body.toLowerCase()}`);
        }
      }

      // ───────── DOWNLOADER ─────────
      case "tiktok":
      case "tt": {
        if (!body) return reply("Example: .tiktok https://vm.tiktok.com/...");
        await react("⏳");
        try {
          const { buffer, title, author } = await downloadTikTok(body);
          await react("✅");
          return sock.sendMessage(
            jid,
            {
              video: buffer,
              caption: `🎵 *${title}*\n👤 ${author}`,
              mimetype: "video/mp4",
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("TikTok error:", err.message);
          await react("❌");
          return reply(
            `❌ Failed to download TikTok video.\n\nError: ${err.message}`,
          );
        }
      }

      // ───────── REACTION MENU ─────────
      case "reactionmenu":
        await react("💫");
        return reply(getReactionMenu());

      // ───────── GAMES ─────────
      case "math": {
        const q = startMath(jid);
        return reply(q);
      }

      case "susunkata":
      case "scramble": {
        const q = startSusunkata(jid);
        return reply(q);
      }

      case "tebakkata":
      case "guessword": {
        const q = startTebakKata(jid);
        return reply(q);
      }

      case "tebakbendera":
      case "guessflag": {
        const q = startTebakBendera(jid);
        return reply(q);
      }

      case "stop": {
        if (!hasActiveGame(jid)) return reply("❌ No active game right now.");
        const ans = stopGame(jid);
        return reply(`🛑 Game stopped!\n\nThe answer was: *${ans}*`);
      }

      // ───────── FUN ─────────
      case "dice":
      case "dadu": {
        const r = Math.floor(Math.random() * 6) + 1;
        const d = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
        await react("🎲");
        return reply(`🎲 *Dice Roll*\n\nResult: ${d[r - 1]} *(${r})*`);
      }

      case "coin":
      case "koin": {
        const r = Math.random() < 0.5 ? "Heads 👑" : "Tails 🪙";
        await react("🪙");
        return reply(`🪙 *Coin Flip*\n\nResult: *${r}*`);
      }

      case "roast": {
        const target = body || pushName;
        const roasts = [
          `${target} is like public WiFi — everyone connects but nothing works.`,
          `${target} has high ambitions. Shame they only appear during sleep.`,
          `Others think hard. ${target} thinks... hard-headed.`,
          `${target} is like an old calendar — irrelevant, still hanging on the wall.`,
          `${target} isn't slow. Just has their own speed — snail pace.`,
          `${target} is like a fake charger — looks legit but delivers nothing.`,
          `${target} is consistent — consistently absent when needed.`,
          `${target} peaked in their imagination. Respect.`,
        ];
        await react("🔥");
        return reply(`🔥 *Roast: ${target}*\n\n${rand(roasts)}`);
      }

      case "ship": {
        if (!isGroup) return reply("❌ This command is for groups only.");
        const mentioned = mentionedJids[0];
        if (!mentioned) return reply("Example: .ship @username");
        try {
          const meta = await sock.groupMetadata(jid);
          const others = meta.participants
            .map((p) => p.id)
            .filter((p) => p !== mentioned && p !== sender);
          if (!others.length) return reply("❌ Not enough group members.");

          const partner = rand(others);
          const pct = Math.floor(Math.random() * 101);
          const filled = Math.floor(pct / 10);
          const bar = "█".repeat(filled) + "░".repeat(10 - filled);
          const p1 = `@${mentioned.split("@")[0]}`;
          const p2 = `@${partner.split("@")[0]}`;

          const captions = [
            [0, 20, "❄️ Cold as ice. Absolutely zero chemistry."],
            [21, 40, "😅 So awkward. Even eye contact is weird."],
            [41, 60, "🙂 Could be friends. Couple? Risky."],
            [61, 80, "😊 Some potential! Don't be shy."],
            [81, 95, "💕 A total match! What are you waiting for?"],
            [96, 100, "🔥 SOULMATES CONFIRMED. Just get married already."],
          ];
          const cap =
            captions.find(([mn, mx]) => pct >= mn && pct <= mx)?.[2] || "";

          const shipText = `💕 *SHIP METER*\n\n${p1} ❤️ ${p2}\n\n[${bar}] *${pct}%*\n\n${cap}`;
          try {
            const gifUrl = await fetchReactionGif("kiss");
            if (gifUrl) {
              const gifBuf = await downloadGif(gifUrl);
              return sock.sendMessage(
                jid,
                {
                  video: gifBuf,
                  gifPlayback: true,
                  caption: shipText,
                  mentions: [mentioned, partner],
                },
                { quoted: msg },
              );
            }
          } catch {
            /* no gif, fall through */
          }

          return sock.sendMessage(
            jid,
            {
              text: shipText,
              mentions: [mentioned, partner],
            },
            { quoted: msg },
          );
        } catch (err) {
          return reply("❌ Failed to fetch group data.");
        }
      }

      case "check": {
        const tName = mentionedJids[0]
          ? `@${mentionedJids[0].split("@")[0]}`
          : body || pushName;
        const kat = rand(CHECK_KATEGORI);
        const pct = Math.floor(Math.random() * 101);
        const filled = Math.floor(pct / 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        const cap =
          kat.captions.find(([mn, mx]) => pct >= mn && pct <= mx)?.[2] || "";
        await react(kat.emoji);
        return sock.sendMessage(
          jid,
          {
            text:
              `🔬 *CHECK METER*\n\n` +
              `👤 Target  : ${tName}\n` +
              `📊 Category: ${kat.label} ${kat.emoji}\n` +
              `📈 Result  : [${bar}] *${pct}%*\n\n` +
              `${cap}`,
            mentions: mentionedJids,
          },
          { quoted: msg },
        );
      }

      // ───────── TOOLS ─────────
      case "afk": {
        const reason = body || "No reason";
        afkList.set(sender, { reason, since: Date.now(), name: pushName });
        return reply(
          `😴 *AFK SET*\n\n• Name  : ${pushName}\n• Reason: ${reason}\n• Time  : ${new Date().toLocaleString()}\n\n_Bot will notify when you return!_`,
        );
      }

      case "smeme": {
        if (!body) {
          return reply("Example: .smeme top text | bottom text");
        }

        const [top, bot] = body.split("|").map((s) => s?.trim());

        await react("😂");

        try {
          const buf = await makeMemeImage(top || "", bot || "");

          // 💾 Save SMeme
          await saveToStorage(buf, "stickers/smeme", "jpg");

          return sock.sendMessage(
            jid,
            {
              image: buf,
              caption: "😂 *MEME*",
              mimetype: "image/jpeg",
            },
            {
              quoted: msg,
            },
          );
        } catch {
          return reply(`😂 *MEME*\n\nTOP: ${top}\nBOTTOM: ${bot}`);
        }
      }

      case "calc": {
        if (!body) return reply("Example: .calc 10 + 5 * 2");
        try {
          const safe = body.replace(/[^0-9+\-*/.() ]/g, "");
          const result = Function(`"use strict"; return (${safe})`)();
          await react("🧮");
          return reply(`🧮 *Calculator*\n\n${body} = *${result}*`);
        } catch {
          return reply("❌ Invalid expression.");
        }
      }

      case "qr": {
        if (!body) return reply("Example: .qr https://example.com");
        await react("⏳");
        try {
          const buf = await qrcode.toBuffer(body, { scale: 8, type: "png" });
          const jpeg = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
          await react("✅");
          return sock.sendMessage(
            jid,
            { image: jpeg, caption: `📱 *QR Code*\n\n${body}` },
            { quoted: msg },
          );
        } catch (err) {
          return reply("❌ Failed to generate QR: " + err.message);
        }
      }

      case "hd": {
        const hasImg2 = !!msg.message?.imageMessage;
        const hasQImg2 = !!quotedMsg?.imageMessage;
        if (!hasImg2 && !hasQImg2)
          return reply(
            "📎 Send image + caption *.hd* or reply to an image with *.hd*",
          );
        await react("⏳");
        try {
          let targetMsg = msg;
          if (!hasImg2 && hasQImg2) {
            const ctx2 = msg.message.extendedTextMessage.contextInfo;
            targetMsg = {
              key: { remoteJid: jid, id: ctx2.stanzaId, fromMe: false },
              message: quotedMsg,
            };
          }
          const buf = await downloadMedia(targetMsg);
          const hd = await sharp(buf)
            .resize({
              width: 1920,
              height: 1920,
              fit: "inside",
              withoutEnlargement: false,
            })
            .sharpen({ sigma: 1.2, m1: 0.5, m2: 3 })
            .jpeg({ quality: 95 })
            .toBuffer();
          await react("✅");
          return sock.sendMessage(
            jid,
            { image: hd, caption: "🖼️ *HD Enhanced*" },
            { quoted: msg },
          );
        } catch (err) {
          await react("❌");
          return reply("❌ Failed to enhance image: " + err.message);
        }
      }

      case "iqc": {
        // WhatsApp long-press context menu screenshot
        // Usage: .iqc sender | message text | 16:40
        const parts = body.split("|").map((s) => s?.trim());
        const iqcSender = mentionedJids[0]
          ? `@${mentionedJids[0].split("@")[0]}`
          : parts[0] || pushName;
        const iqcMsg = parts[1] || parts[0] || "Hey! 👋";
        const iqcTime =
          parts[2] ||
          (() => {
            const now = new Date();
            return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          })();
        await react("📲");
        try {
          const buf = await makeIQCImage(
            mentionedJids[0] ? iqcSender : parts[1] ? parts[0] : "",
            mentionedJids[0]
              ? parts[0] || "Hey! 👋"
              : parts[1] || parts[0] || "Hey! 👋",
            iqcTime,
          );
          return sock.sendMessage(
            jid,
            {
              image: buf,
              caption: `📲 *IQC*`,
              mimetype: "image/jpeg",
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("IQC error:", err.message);
          return reply("❌ Failed to generate IQC image: " + err.message);
        }
      }

      case "fake": {
        // Usage: .fake ContactName | msg1 | msg2 | msg3 ...
        // Messages alternate: msg1 = incoming (contact), msg2 = outgoing (me), etc.
        // Prefix a part with ">" to force outgoing, "<" to force incoming.
        if (!body)
          return reply(
            "📱 *Fake Chat Generator*\n\n" +
              "Usage: .fake *Name* | message1 | message2 | ...\n\n" +
              "Messages alternate in/out automatically.\n" +
              "Prefix with *>* for sent, *<* for received.\n\n" +
              "Example:\n.fake Sarah | Hey, you free tonight? | Yeah what's up? | Wanna grab dinner? | Sure! 7PM?",
          );
        await react("📱");
        try {
          const parts = body.split("|").map((s) => s.trim());
          const contactName = parts[0];
          const rawMsgs = parts.slice(1);
          if (!rawMsgs.length)
            return reply("❌ Add at least one message after the name.");

          const messages = rawMsgs.map((txt, i) => {
            if (txt.startsWith(">"))
              return { from: "me", text: txt.slice(1).trim() };
            if (txt.startsWith("<"))
              return { from: contactName, text: txt.slice(1).trim() };
            // Alternate: even index = incoming (contact), odd = outgoing (me)
            return { from: i % 2 === 0 ? contactName : "me", text: txt };
          });

          const buf = await downloadMedia(fakeMsg);

          // 💾 Save revealed media
          if (isVideo) {
            await saveToStorage(buf, "revealed", "mp4");
          } else {
            await saveToStorage(buf, "revealed", "jpg");
          }

          await react("✅");
          return sock.sendMessage(
            jid,
            {
              image: buf,
              caption: `📱 *Fake Chat* — ${contactName}`,
              mimetype: "image/jpeg",
            },
            { quoted: msg },
          );
        } catch (err) {
          console.error("Fake chat error:", err.message);
          await react("❌");
          return reply("❌ Failed to generate fake chat: " + err.message);
        }
      }

      case "qc": {
        const [quoteTxt, author] = body.split("|").map((s) => s?.trim());
        if (!quoteTxt) return reply("Example: .qc Life is short | Anonymous");
        await react("✍️");
        try {
          const buf = await makeQuoteCard(quoteTxt, author);
          return sock.sendMessage(
            jid,
            { image: buf, caption: "✍️ *Quote*", mimetype: "image/jpeg" },
            { quoted: msg },
          );
        } catch (err) {
          console.error("QC error:", err.message);
          return reply(`✍️ *"${quoteTxt}"*\n${author ? `— ${author}` : ""}`);
        }
      }

      // ───────── GROUP ─────────
      case "groupinfo": {
        if (!isGroup) return reply("❌ Groups only.");
        try {
          const meta = await sock.groupMetadata(jid);
          const admins = meta.participants.filter((p) => p.admin).length;
          return reply(
            `╔═══════════════════╗\n` +
              `║   📋 GROUP INFO   ║\n` +
              `╚═══════════════════╝\n\n` +
              `📌 Name    : ${meta.subject}\n` +
              `👥 Members : ${meta.participants.length}\n` +
              `👑 Admins  : ${admins}\n` +
              `🆔 ID      : ${jid}\n` +
              `📅 Created : ${new Date(meta.creation * 1000).toLocaleDateString()}\n` +
              `📝 Desc    : ${meta.desc || "No description"}`,
          );
        } catch {
          return reply("❌ Failed to fetch group info.");
        }
      }

      case "groupsettings": {
        if (!isGroup) return reply("❌ Groups only.");
        const s = getSettings(jid);
        return reply(
          `⚙️ *Group Settings*\n\n` +
            `• Welcome  : ${s.welcome ? "✅ ON" : "❌ OFF"}\n` +
            `• Goodbye  : ${s.goodbye ? "✅ ON" : "❌ OFF"}\n` +
            `• AntiBot  : ${s.antibot ? "✅ ON" : "❌ OFF"}\n` +
            `• AntiCall : ${s.anticall ? "✅ ON" : "❌ OFF"}\n` +
            `• Mute     : ${s.mute ? "✅ ON" : "❌ OFF"}`,
        );
      }

      case "announcement": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        if (!body) return reply("Example: .announcement Hello everyone!");
        await react("📢");
        try {
          const meta = await sock.groupMetadata(jid);
          const mentions = meta.participants.map((p) => p.id);
          const text = `📢 *ANNOUNCEMENT*\n\n${body}\n\n_— Mekyy Bot_`;
          await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
          return react("✅");
        } catch (err) {
          return reply("❌ Failed: " + err.message);
        }
      }

      case "tagall": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        try {
          const meta = await sock.groupMetadata(jid);
          const mentions = meta.participants.map((p) => p.id);
          const tagText =
            (body ? `📢 ${body}\n\n` : `📢 *Tag All!*\n\n`) +
            mentions.map((m) => `@${m.split("@")[0]}`).join(" ");
          return sock.sendMessage(
            jid,
            { text: tagText, mentions },
            { quoted: msg },
          );
        } catch {
          return reply("❌ Failed to tag all.");
        }
      }

      case "hidetag": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        try {
          const meta = await sock.groupMetadata(jid);
          const mentions = meta.participants.map((p) => p.id);
          return sock.sendMessage(
            jid,
            { text: body || ".", mentions },
            { quoted: msg },
          );
        } catch {
          return reply("❌ Failed.");
        }
      }

      case "add": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        if (!body) return reply("Example: .add 601234567890");
        const number = body.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        try {
          await sock.groupParticipantsUpdate(jid, [number], "add");
          return reply(`✅ Added *${body}* to the group!`);
        } catch (err) {
          return reply(`❌ Failed to add: ${err.message}`);
        }
      }

      case "kick":
      case "remove": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        const target = mentionedJids[0];
        if (!target) return reply("Example: .kick @username");
        try {
          await sock.groupParticipantsUpdate(jid, [target], "remove");
          return reply(`✅ *@${target.split("@")[0]}* has been removed.`);
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "promote": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        const target = mentionedJids[0];
        if (!target) return reply("Example: .promote @username");
        try {
          await sock.groupParticipantsUpdate(jid, [target], "promote");
          return reply(`✅ *@${target.split("@")[0]}* is now an admin! 👑`);
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "demote": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        const target = mentionedJids[0];
        if (!target) return reply("Example: .demote @username");
        try {
          await sock.groupParticipantsUpdate(jid, [target], "demote");
          return reply(`✅ *@${target.split("@")[0]}* has been demoted.`);
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "close":
      case "lock": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        try {
          await sock.groupSettingUpdate(jid, "announcement");
          return reply("🔒 Group locked. Only admins can send messages.");
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "open":
      case "unlock": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        try {
          await sock.groupSettingUpdate(jid, "not_announcement");
          return reply("🔓 Group opened. All members can send messages.");
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "mute": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        setSetting(jid, "mute", true);
        return reply("🔇 Group muted. Bot will ignore non-command messages.");
      }

      case "unmute": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        setSetting(jid, "mute", false);
        return reply("🔊 Group unmuted.");
      }

      case "antibot": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        const on = body.toLowerCase() === "on";
        setSetting(jid, "antibot", on);
        return reply(
          `🤖 AntiBot: ${on ? "✅ ON — Bot accounts will be removed" : "❌ OFF"}`,
        );
      }

      case "anticall": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        const on = body.toLowerCase() === "on";
        setSetting(jid, "anticall", on);
        return reply(
          `📵 AntiCall: ${on ? "✅ ON — Calls will be rejected" : "❌ OFF"}`,
        );
      }

      case "setwelcome": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        if (!body)
          return reply(
            "Example: .setwelcome Welcome {user} to {group}!\n\nVariables: {user} {group}",
          );
        setSetting(jid, "welcome", true);
        setSetting(jid, "welcomeMsg", body);
        return reply(`✅ *Welcome message set!*\n\n${body}`);
      }

      case "setgoodbye": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        if (!body)
          return reply(
            "Example: .setgoodbye Goodbye {user}!\n\nVariables: {user} {group}",
          );
        setSetting(jid, "goodbye", true);
        setSetting(jid, "goodbyeMsg", body);
        return reply(`✅ *Goodbye message set!*\n\n${body}`);
      }

      case "setdesc": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        if (!body) return reply("Example: .setdesc New group description here");
        try {
          await sock.groupUpdateDescription(jid, body);
          return reply("✅ Group description updated!");
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "setsubject": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        if (!body) return reply("Example: .setsubject New Group Name");
        try {
          await sock.groupUpdateSubject(jid, body);
          return reply(`✅ Group name updated to: *${body}*`);
        } catch {
          return reply("❌ Failed. Make sure bot is admin.");
        }
      }

      case "leavegroup":
      case "left": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        await reply("👋 Leaving group. Goodbye!");
        try {
          await sock.groupLeave(jid);
        } catch {
          /* already left */
        }
        break;
      }

      case "clearchat":
      case "clear": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        const spaces = "\u200B\n".repeat(30);
        return sock.sendMessage(jid, {
          text: spaces + "\n🧹 *Chat cleared by Mekyy Bot*",
        });
      }

      case "info": {
        if (!isGroup) return reply("❌ Groups only.");
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        return sock.sendMessage(jid, {
          text: `📌 *GROUP INFO*\n\n${body || "No info provided."}`,
        });
      }

      case "rules":
        if (!isGroup) return reply("❌ Groups only.");
        return reply(
          `📜 *Group Rules*\n\n` +
            `1️⃣ Be respectful to all members\n` +
            `2️⃣ No spamming\n` +
            `3️⃣ No NSFW content\n` +
            `4️⃣ No hate speech\n` +
            `5️⃣ Listen to the admins\n\n` +
            `_Contact an admin for more info._`,
        );

      case "listgroup": {
        if (!(await isAdmin(sock, jid, sender)))
          return reply("🔒 *Admin only.*");
        try {
          const chats = await sock.groupFetchAllParticipating();
          const groups = Object.values(chats);
          if (!groups.length) return reply("No groups found.");
          const list = groups
            .map(
              (g, i) =>
                `${i + 1}. ${g.subject} (${g.participants.length} members)`,
            )
            .join("\n");
          return reply(`📋 *Group List*\n\n${list}`);
        } catch {
          return reply("❌ Failed to fetch group list.");
        }
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Handler error:", err);
  }
}
