import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";

/**
 * Creates a classic meme image: white bg, bold top + bottom text with outline.
 */
export async function makeMemeImage(topText, bottomText) {
  const W = 600;
  const H = 600;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Light gray border frame
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  const drawMemeText = (text, yBase, fromTop) => {
    if (!text) return;
    const upper = text.toUpperCase();

    let fontSize = 72;
    ctx.font = `bold ${fontSize}px Arial`;
    while (ctx.measureText(upper).width > W - 40 && fontSize > 20) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Arial`;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = fromTop ? "top" : "bottom";

    // White outline
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = fontSize / 8;
    ctx.lineJoin = "round";
    ctx.strokeText(upper, W / 2, yBase);

    // Black fill
    ctx.fillStyle = "#111111";
    ctx.fillText(upper, W / 2, yBase);
  };

  drawMemeText(topText, 20, true);
  drawMemeText(bottomText, H - 20, false);

  const pngBuffer = canvas.toBuffer("image/png");

  const jpegBuffer = await sharp(pngBuffer)
    .resize(600, 600, { fit: "contain", background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92 })
    .toBuffer();

  return jpegBuffer;
}
