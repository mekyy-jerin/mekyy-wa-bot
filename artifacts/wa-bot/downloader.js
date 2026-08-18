// Media downloader using free public APIs

export async function downloadTikTok(url) {
  const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
  const res = await fetch(apiUrl, {
    headers: { "User-Agent": "MekyyBot/1.0", "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();

  if (json.code !== 0) throw new Error(json.msg || "Failed to fetch video info");

  const { data } = json;
  const videoUrl = data.play || data.wmplay;
  if (!videoUrl) throw new Error("No video URL in response");

  const videoRes = await fetch(videoUrl, { headers: { "User-Agent": "MekyyBot/1.0" } });
  if (!videoRes.ok) throw new Error(`Video download failed: ${videoRes.status}`);

  const buffer = Buffer.from(await videoRes.arrayBuffer());
  return {
    buffer,
    title: data.title || "TikTok Video",
    duration: data.duration || 0,
    author: data.author?.nickname || "Unknown",
  };
}

export async function downloadInstagram(url) {
  const apiUrl = `https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/get-info-rapidapi?url=${encodeURIComponent(url)}`;
  // Fallback: use a public endpoint
  const res = await fetch(`https://igdl.me/api/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "MekyyBot/1.0" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`IG API error: ${res.status}`);
  const json = await res.json();
  if (!json.url) throw new Error("No URL returned");

  const videoRes = await fetch(json.url);
  const buffer = Buffer.from(await videoRes.arrayBuffer());
  return { buffer, title: "Instagram Video" };
}
