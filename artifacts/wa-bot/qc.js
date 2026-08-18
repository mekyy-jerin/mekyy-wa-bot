// Instagram-style quote card generator
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const W = 600, H = 700;

const AVATAR_COLORS = [
  ["#f09433","#e6683c","#dc2743","#cc2366","#bc1888"], // IG gradient 1
  ["#405de6","#5851db","#833ab4","#c13584","#e1306c"], // IG gradient 2
  ["#fcb045","#fd1d1d","#833ab4"],                      // IG gradient 3
  ["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"],
  ["#fa709a","#fee140"],
];

const FLAT_COLORS = ["#E91E63","#9C27B0","#2196F3","#00BCD4","#4CAF50","#FF9800","#F44336","#3F51B5"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function drawGradientCircle(ctx, cx, cy, r, colors) {
  // Gradient ring (IG story style)
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, 2 * Math.PI);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.stroke();

  // White gap
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, 2 * Math.PI);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avatar fill
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fillStyle = rand(FLAT_COLORS);
  ctx.fill();

  // Initial letter
  ctx.font = `bold ${Math.round(r * 0.75)}px Arial`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  ctx.fillText(letters[Math.floor(Math.random() * letters.length)], cx, cy + 1);
}

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

export async function makeQuoteCard(quoteText, authorName = "") {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Dark background with subtle noise ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0a0a0a");
  bgGrad.addColorStop(0.5, "#111111");
  bgGrad.addColorStop(1, "#0d0d0d");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle vignette corners
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent line (IG gradient) ──
  const accentColors = rand(AVATAR_COLORS);
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentColors.forEach((c, i) => accentGrad.addColorStop(i / (accentColors.length - 1), c));
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 4);

  // ── Three overlapping avatars ──
  const avR = 36, avY = 90;
  const avPositions = [W/2 - 60, W/2, W/2 + 60];
  avPositions.forEach((cx, i) => {
    drawGradientCircle(ctx, cx, avY, avR, rand(AVATAR_COLORS));
  });

  // ── Decorative big quote mark ──
  ctx.font = `bold 120px Georgia, serif`;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("\u201C", 28, 140);

  // ── Quote text ──
  const maxFontSize = 38;
  let fontSize = maxFontSize;
  const maxTextW = W - 100;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Shrink if text too long
  let lines = [];
  do {
    ctx.font = `${fontSize}px Georgia, serif`;
    lines = wrapText(ctx, quoteText, maxTextW);
    if (lines.length <= 5) break;
    fontSize -= 2;
  } while (fontSize > 18);

  const lineH = fontSize * 1.55;
  const totalTextH = lines.length * lineH;
  const textStartY = 175 + (260 - totalTextH) / 2;

  // Text shadow glow
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.08)";
  ctx.shadowBlur = 20;
  lines.forEach((line, i) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    ctx.fillText(line, W / 2, textStartY + i * lineH);
  });
  ctx.restore();

  // Closing quote mark
  ctx.font = `bold 120px Georgia, serif`;
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.textAlign = "right";
  ctx.fillText("\u201D", W - 28, textStartY + totalTextH - 60);

  // ── Thin divider ──
  const divY = 465;
  ctx.beginPath();
  ctx.moveTo(W/2 - 80, divY);
  ctx.lineTo(W/2 + 80, divY);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Author name ──
  if (authorName) {
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`— ${authorName}`, W / 2, divY + 16);
  }

  // ── Fake IG engagement row ──
  const engY = H - 80;
  const likes = randInt(800, 9900);
  const comments = randInt(30, 450);

  // IG-style like button
  ctx.font = "22px Arial";
  ctx.textBaseline = "middle";

  // Heart
  ctx.fillStyle = "#ED4956";
  ctx.textAlign = "left";
  ctx.fillText("❤️", 40, engY);
  ctx.font = "14px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`${likes.toLocaleString()}`, 70, engY);

  // Comment
  ctx.font = "20px Arial";
  ctx.fillText("💬", 140, engY);
  ctx.font = "14px Arial";
  ctx.fillText(`${comments}`, 168, engY);

  // Bookmark (right side)
  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.fillText("🔖", W - 40, engY);

  // Share
  ctx.fillText("📤", W - 80, engY);

  // ── Bottom bar: username + follow button ──
  const barY = H - 40;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "13px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`@mekyy_bot`, 40, barY);
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#0095f6";
  ctx.textAlign = "right";
  ctx.fillText("Follow", W - 40, barY);

  // Bottom accent line
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, H - 4, W, 4);

  return sharp(canvas.toBuffer("image/png")).jpeg({ quality: 93 }).toBuffer();
}
