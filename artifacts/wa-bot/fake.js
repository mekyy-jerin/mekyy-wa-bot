// Fake WhatsApp conversation screenshot generator
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const W = 420, PADDING = 12;
const BUBBLE_MAX = 300;
const BG = "#111B21";
const IN_BG = "#1F2C34";
const OUT_BG = "#005C4B";
const TEXT_CLR = "#E9EDEF";
const TIME_CLR = "#8696A0";
const HDR_BG = "#1F2C34";
const AVATAR_COLORS = ["#E91E63","#9C27B0","#2196F3","#00BCD4","#4CAF50","#FF9800","#F44336","#3F51B5"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function bubbleHeight(ctx, text, maxW) {
  ctx.font = "15px Arial";
  const lines = wrapText(ctx, text, maxW - 24);
  return lines.length * 22 + 34; // line height + padding + time row
}

/**
 * @param {Array<{from: string, text: string, time?: string}>} messages
 * @param {string} contactName
 * @param {string} myName
 */
export async function makeFakeChat(messages, contactName = "Contact", myName = "Me") {
  // Pre-measure total height
  const measureCanvas = createCanvas(W, 100);
  const mCtx = measureCanvas.getContext("2d");

  let totalH = 64; // header
  const msgData = messages.map(m => {
    const isOut = m.from.toLowerCase() === "me" || m.from === myName;
    const maxBub = BUBBLE_MAX;
    mCtx.font = "15px Arial";
    const h = bubbleHeight(mCtx, m.text, maxBub);
    totalH += h + 6;
    return { ...m, isOut, h };
  });
  totalH += 20; // bottom padding

  const H = Math.max(totalH, 300);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ──
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle wallpaper dots
  ctx.fillStyle = "rgba(255,255,255,0.015)";
  for (let y = 0; y < H; y += 24) {
    for (let x = 0; x < W; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // ── Header ──
  ctx.fillStyle = HDR_BG;
  ctx.fillRect(0, 0, W, 64);

  // Back arrow
  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "#00A884";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("‹", 10, 32);

  // Avatar
  const avColor = rand(AVATAR_COLORS);
  ctx.beginPath();
  ctx.arc(44, 32, 18, 0, 2 * Math.PI);
  ctx.fillStyle = avColor;
  ctx.fill();
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(contactName[0]?.toUpperCase() || "?", 44, 33);

  // Contact name + status
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = TEXT_CLR;
  ctx.textAlign = "left";
  ctx.fillText(contactName, 70, 24);
  ctx.font = "12px Arial";
  ctx.fillStyle = "#00A884";
  ctx.fillText("online", 70, 42);

  // Icons right side
  ctx.font = "18px Arial";
  ctx.fillStyle = "#8696A0";
  ctx.textAlign = "right";
  ctx.fillText("📞  ⋮", W - 12, 32);

  // ── Messages ──
  let curY = 72;
  const lineH = 22;

  for (const m of msgData) {
    const isOut = m.isOut;
    const maxBub = BUBBLE_MAX;
    const bW = Math.min(maxBub, W - 24);
    const bX = isOut ? W - bW - 10 : 10;

    ctx.font = "15px Arial";
    const lines = wrapText(ctx, m.text, bW - 24);
    const bH = m.h;

    // Bubble shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Bubble shape (rounded rect)
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(bX + r, curY);
    ctx.lineTo(bX + bW - r, curY);
    ctx.quadraticCurveTo(bX + bW, curY, bX + bW, curY + r);
    ctx.lineTo(bX + bW, curY + bH - r);
    ctx.quadraticCurveTo(bX + bW, curY + bH, bX + bW - r, curY + bH);
    ctx.lineTo(bX + r, curY + bH);
    ctx.quadraticCurveTo(bX, curY + bH, bX, curY + bH - r);
    ctx.lineTo(bX, curY + r);
    ctx.quadraticCurveTo(bX, curY, bX + r, curY);
    ctx.closePath();
    ctx.fillStyle = isOut ? OUT_BG : IN_BG;
    ctx.fill();
    ctx.restore();

    // Tail
    ctx.save();
    ctx.fillStyle = isOut ? OUT_BG : IN_BG;
    if (isOut) {
      ctx.beginPath();
      ctx.moveTo(bX + bW, curY + 10);
      ctx.lineTo(bX + bW + 6, curY + 4);
      ctx.lineTo(bX + bW, curY + 20);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(bX, curY + 10);
      ctx.lineTo(bX - 6, curY + 4);
      ctx.lineTo(bX, curY + 20);
      ctx.fill();
    }
    ctx.restore();

    // Message text
    ctx.font = "15px Arial";
    ctx.fillStyle = TEXT_CLR;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((line, i) => ctx.fillText(line, bX + 12, curY + 10 + i * lineH));

    // Timestamp + read ticks
    const timeStr = m.time || `${String(Math.floor(Math.random() * 12) + 1).padStart(2,"0")}:${String(Math.floor(Math.random()*60)).padStart(2,"0")} ${Math.random() > 0.5 ? "AM" : "PM"}`;
    ctx.font = "11px Arial";
    ctx.fillStyle = TIME_CLR;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const tickStr = isOut ? ` ✓✓` : "";
    ctx.fillText(timeStr + tickStr, bX + bW - 10, curY + bH - 6);

    curY += bH + 6;
  }

  return sharp(canvas.toBuffer("image/png")).jpeg({ quality: 92 }).toBuffer();
}
