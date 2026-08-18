// Reaction GIFs — primary: api.otakugifs.xyz (CDN download allowed)
// GET https://api.otakugifs.xyz/gif?reaction={type} → { url: "cdn_url" }

export const REACTIONS = {
  kiss:    { emoji: "😘", label: "kissed" },
  hug:     { emoji: "🤗", label: "hugged" },
  pat:     { emoji: "🥰", label: "patted" },
  slap:    { emoji: "👋", label: "slapped" },
  punch:   { emoji: "👊", label: "punched" },
  cuddle:  { emoji: "💕", label: "cuddled" },
  poke:    { emoji: "☝️",  label: "poked" },
  bite:    { emoji: "😬", label: "bit" },
  wave:    { emoji: "👋", label: "waved at" },
  dance:   { emoji: "💃", label: "danced with" },
  cry:     { emoji: "😢", label: "cried at" },
  blush:   { emoji: "😊", label: "made blush" },
  wink:    { emoji: "😉", label: "winked at" },
  tickle:  { emoji: "🤭", label: "tickled" },
  lick:    { emoji: "👅", label: "licked" },
  nuzzle:  { emoji: "🥺", label: "nuzzled" },
  stare:   { emoji: "👀", label: "stared at" },
  happy:   { emoji: "😄", label: "made happy" },
  nom:     { emoji: "😋", label: "nommed" },
};

export async function fetchReactionGif(type) {
  try {
    const res = await fetch(`https://api.otakugifs.xyz/gif?reaction=${type}`, {
      headers: {
        "User-Agent": "MekyyBot/1.0",
        "Accept": "application/json",
      },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data?.url || null;
  } catch (err) {
    console.error(`[Reaction] Fetch error [${type}]:`, err.message);
    return null;
  }
}

export async function downloadGif(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/gif,image/webp,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`GIF download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export function getReactionMenu() {
  const lines = Object.entries(REACTIONS).map(
    ([cmd, { emoji, label }]) =>
      `│ .${cmd.padEnd(8)} ${emoji}  ${label}`
  );
  return (
    `╔══════════════════════════╗\n` +
    `║   💫  REACTION MENU     ║\n` +
    `╚══════════════════════════╝\n` +
    lines.join("\n") + "\n" +
    `╰──────────────────────────\n\n` +
    `_Usage: .kiss @user | .hug @user_\n` +
    `_Some work without a mention too!_`
  );
}
