import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import GIFEncoder from "gif-encoder-2";

/**
 * Creates a brat-style sticker: white bg, blurry smeared lowercase text.
 * Returns a WebP Buffer ready to send as a WhatsApp sticker.
 */
export async function makeBratSticker(inputText) {
  const text = inputText.toLowerCase();
  const SIZE = 512;

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Pick font size that fits
  let fontSize = 96;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  // Word-wrap: split into lines that fit within SIZE - padding
  const padding = 40;
  const maxWidth = SIZE - padding * 2;
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Scale font down if too many lines
  const lineHeight = fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  if (totalHeight > SIZE - padding * 2) {
    fontSize = Math.floor((fontSize * (SIZE - padding * 2)) / totalHeight);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  }

  const finalLineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * finalLineHeight;
  const startY = (SIZE - totalTextHeight) / 2 + fontSize * 0.8;

  // ── Brat blur effect ──
  // Draw text several times with tiny random offsets and low opacity
  // to simulate the smeared/blurry brat aesthetic
  const offsets = [
    [-3, -2],
    [3, -2],
    [-2, 3],
    [2, 3],
    [-4, 0],
    [4, 0],
    [0, -4],
    [0, 4],
    [-2, -3],
    [2, 3],
  ];

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  for (const [dx, dy] of offsets) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#111111";
    lines.forEach((line, i) => {
      ctx.fillText(line, SIZE / 2 + dx, startY + i * finalLineHeight + dy);
    });
  }

  // Main text on top — solid
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#111111";
  lines.forEach((line, i) => {
    ctx.fillText(line, SIZE / 2, startY + i * finalLineHeight);
  });

  const pngBuffer = canvas.toBuffer("image/png");

  // Convert PNG → WebP (required format for WA stickers)
  const webpBuffer = await sharp(pngBuffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 90 })
    .toBuffer();

  return webpBuffer;
}
