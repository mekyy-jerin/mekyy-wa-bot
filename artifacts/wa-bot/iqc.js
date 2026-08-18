// WhatsApp long-press context menu screenshot generator
// Mimics the WA dark mode UI when you long-press a message
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const W = 400;
const BG = "#0B141A";
const BUBBLE_BG = "#1F2C34";
const PANEL_BG  = "#233138";
const TEXT_CLR  = "#E9EDEF";
const TIME_CLR  = "#8696A0";
const OVERLAY   = "rgba(0,0,0,0.65)";
const DIVIDER   = "rgba(255,255,255,0.07)";
const DELETE_CLR= "#EF5350";

const MENU_ITEMS = [
  { icon: "☆", label: "Star" },
  { icon: "↩", label: "Reply" },
  { icon: "↪", label: "Forward" },
  { icon: "⎘", label: "Copy" },
  { icon: "☺", label: "React" },
  { icon: "⚠", label: "Report" },
];
const DELETE_ITEM = { icon: "⌦", label: "Delete" };

const EMOJI_REACTIONS = ["👍","❤️","😂","😮","😢","🙏","➕"];

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawRoundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x, y + h - r,     r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

export async function makeIQCImage(senderName = "Contact", messageText = "Hey! 👋", timeStr = "16:40") {
  // Measure bubble height
  const BUBBLE_MAX_W = 260, BUBBLE_PAD = 14;
  const measureCanvas = createCanvas(W, 100);
  const mCtx = measureCanvas.getContext("2d");
  mCtx.font = "15px Arial";
  const lines = wrapText(mCtx, messageText, BUBBLE_MAX_W - BUBBLE_PAD * 2);
  const LINE_H = 22;
  const bubbleContentH = lines.length * LINE_H + 10; // text height
  const bubbleH = bubbleContentH + 32; // + padding + time row

  // Layout heights
  const BLUR_TOP_H  = 120;   // blurred background area above
  const BUBBLE_TOP  = BLUR_TOP_H + 16;
  const EMOJI_TOP   = BUBBLE_TOP + bubbleH + 16;
  const EMOJI_H     = 56;
  const PANEL_TOP   = EMOJI_TOP + EMOJI_H + 6;
  const ITEM_H      = 52;
  const PANEL_H     = (MENU_ITEMS.length + 1) * ITEM_H + 8; // +1 for delete
  const BOTTOM_PAD  = 24;
  const H = PANEL_TOP + PANEL_H + BOTTOM_PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Full background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── Fake blurred chat rows above (background decor) ──
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  [30, 55, 80, 105].forEach(y => ctx.fillRect(20, y, W * 0.55 + Math.random() * 60, 14));

  // Dark overlay over blurred section
  ctx.fillStyle = OVERLAY;
  ctx.fillRect(0, 0, W, BUBBLE_TOP + bubbleH + EMOJI_H + 10);

  // ── Message bubble ──
  const bX = 12, bW = BUBBLE_MAX_W + 20;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  drawRoundRect(ctx, bX, BUBBLE_TOP, bW, bubbleH, 10, BUBBLE_BG);
  ctx.restore();

  // Bubble tail (left side — incoming message)
  ctx.fillStyle = BUBBLE_BG;
  ctx.beginPath();
  ctx.moveTo(bX, BUBBLE_TOP + 12);
  ctx.lineTo(bX - 7, BUBBLE_TOP + 5);
  ctx.lineTo(bX, BUBBLE_TOP + 22);
  ctx.fill();

  // Sender name (green, shown for group context)
  if (senderName) {
    ctx.font = "bold 13px Arial";
    ctx.fillStyle = "#00A884";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(senderName, bX + BUBBLE_PAD, BUBBLE_TOP + 10);
  }

  // Message text
  const textStartY = BUBBLE_TOP + (senderName ? 30 : 10);
  ctx.font = "15px Arial";
  ctx.fillStyle = TEXT_CLR;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, bX + BUBBLE_PAD, textStartY + i * LINE_H));

  // Timestamp + ticks
  const timeY = BUBBLE_TOP + bubbleH - 20;
  ctx.font = "11px Arial";
  ctx.fillStyle = TIME_CLR;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${timeStr}  ✓✓`, bX + bW - BUBBLE_PAD, timeY + 14);

  // ── Emoji reaction picker ──
  const emojiPanelW = W - 24, emojiPanelH = EMOJI_H;
  drawRoundRect(ctx, 12, EMOJI_TOP, emojiPanelW, emojiPanelH, 28, PANEL_BG);

  const emojiSpacing = emojiPanelW / EMOJI_REACTIONS.length;
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  EMOJI_REACTIONS.forEach((emoji, i) => {
    const ex = 12 + emojiSpacing * i + emojiSpacing / 2;
    const ey = EMOJI_TOP + EMOJI_H / 2;
    // Hover highlight on first emoji
    if (i === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(ex, ey, 20, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();
      ctx.restore();
    }
    ctx.fillText(emoji, ex, ey);
  });

  // ── Context menu panel ──
  drawRoundRect(ctx, 12, PANEL_TOP, W - 24, PANEL_H, 12, PANEL_BG);

  const allItems = [...MENU_ITEMS, null, DELETE_ITEM]; // null = divider
  let itemY = PANEL_TOP + 4;

  for (const item of allItems) {
    if (item === null) {
      // Thin divider
      ctx.fillStyle = DIVIDER;
      ctx.fillRect(20, itemY, W - 40, 1);
      itemY += 1;
      continue;
    }

    const isDelete = item.label === "Delete";
    const clr = isDelete ? DELETE_CLR : TEXT_CLR;

    // Row background on hover (visual style — always off here)
    ctx.font = "17px Arial";
    ctx.fillStyle = clr;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(item.label, 44, itemY + ITEM_H / 2);

    // Icon (right side)
    ctx.textAlign = "right";
    ctx.font = "20px Arial";
    ctx.fillStyle = isDelete ? DELETE_CLR : "rgba(255,255,255,0.45)";
    ctx.fillText(item.icon, W - 32, itemY + ITEM_H / 2);

    // Row divider (except last)
    if (!isDelete) {
      ctx.fillStyle = DIVIDER;
      ctx.fillRect(20, itemY + ITEM_H - 0.5, W - 40, 0.5);
    }

    itemY += ITEM_H;
  }

  return sharp(canvas.toBuffer("image/png")).jpeg({ quality: 93 }).toBuffer();
}
