// Active games per chat jid
const activeGames = new Map();

// ── Word lists ──────────────────────────────
const SCRAMBLE_WORDS = [
  "javascript","python","computer","keyboard","internet","programming",
  "algorithm","database","developer","software","hardware","network",
  "browser","website","security","password","download","instagram",
  "whatsapp","telegram","android","bluetooth","wireless","platform",
  "function","variable","operator","compiler","terminal","directory",
];

const WORD_HINTS = [
  { word: "elephant", hint: "🐘 The largest land animal on Earth" },
  { word: "piano", hint: "🎹 A musical instrument with black and white keys" },
  { word: "volcano", hint: "🌋 A mountain that can erupt with lava" },
  { word: "library", hint: "📚 A building full of books you can borrow" },
  { word: "diamond", hint: "💎 The hardest natural substance known" },
  { word: "rainbow", hint: "🌈 An arc of colors after rain" },
  { word: "penguin", hint: "🐧 A bird that cannot fly but can swim" },
  { word: "compass", hint: "🧭 A tool that always points north" },
  { word: "thunder", hint: "⛈️ The loud sound during a storm" },
  { word: "lantern", hint: "🏮 A light source you can carry" },
  { word: "cactus", hint: "🌵 A desert plant with sharp spines" },
  { word: "anchor", hint: "⚓ Used to keep a ship in place" },
  { word: "galaxy", hint: "🌌 A system of billions of stars" },
  { word: "tunnel", hint: "🚇 An underground passage" },
  { word: "trophy", hint: "🏆 An award given to winners" },
];

const FLAGS = [
  { emoji: "🇲🇾", country: "Malaysia", alt: ["MY"] },
  { emoji: "🇯🇵", country: "Japan", alt: ["JP"] },
  { emoji: "🇰🇷", country: "South Korea", alt: ["Korea", "KR"] },
  { emoji: "🇧🇷", country: "Brazil", alt: ["BR"] },
  { emoji: "🇩🇪", country: "Germany", alt: ["Deutschland", "DE"] },
  { emoji: "🇫🇷", country: "France", alt: ["FR"] },
  { emoji: "🇮🇹", country: "Italy", alt: ["IT"] },
  { emoji: "🇦🇺", country: "Australia", alt: ["AU"] },
  { emoji: "🇨🇦", country: "Canada", alt: ["CA"] },
  { emoji: "🇮🇩", country: "Indonesia", alt: ["ID"] },
  { emoji: "🇵🇭", country: "Philippines", alt: ["PH"] },
  { emoji: "🇹🇭", country: "Thailand", alt: ["TH"] },
  { emoji: "🇻🇳", country: "Vietnam", alt: ["VN"] },
  { emoji: "🇸🇬", country: "Singapore", alt: ["SG"] },
  { emoji: "🇲🇽", country: "Mexico", alt: ["MX"] },
  { emoji: "🇦🇷", country: "Argentina", alt: ["AR"] },
  { emoji: "🇪🇬", country: "Egypt", alt: ["EG"] },
  { emoji: "🇿🇦", country: "South Africa", alt: ["SA"] },
  { emoji: "🇳🇱", country: "Netherlands", alt: ["Holland", "NL"] },
  { emoji: "🇵🇰", country: "Pakistan", alt: ["PK"] },
  { emoji: "🇳🇬", country: "Nigeria", alt: ["NG"] },
  { emoji: "🇸🇦", country: "Saudi Arabia", alt: ["Saudi", "KSA"] },
  { emoji: "🇦🇪", country: "UAE", alt: ["Emirates", "Dubai"] },
  { emoji: "🇷🇺", country: "Russia", alt: ["RU"] },
  { emoji: "🇮🇳", country: "India", alt: ["IN"] },
];

function shuffle(str) {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join("");
  return result === str ? shuffle(str) : result;
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Start functions ──────────────────────────

export function startMath(jid) {
  const ops = ["+", "-", "*"];
  const op = rand(ops);
  let a, b, answer;
  if (op === "+") { a = rand([...Array(50).keys()]); b = rand([...Array(50).keys()]); answer = a + b; }
  else if (op === "-") { a = rand([...Array(50).keys()]) + 20; b = rand([...Array(20).keys()]); answer = a - b; }
  else { a = rand([2,3,4,5,6,7,8,9,10,11,12]); b = rand([2,3,4,5,6,7,8,9,10]); answer = a * b; }

  activeGames.set(jid, { type: "math", answer: String(answer), startedAt: Date.now() });
  return `🧮 *MATH CHALLENGE*\n\n❓ What is *${a} ${op} ${b}*?\n\n_Type your answer!_`;
}

export function startSusunkata(jid) {
  const word = rand(SCRAMBLE_WORDS);
  const scrambled = shuffle(word);
  activeGames.set(jid, { type: "susunkata", answer: word, startedAt: Date.now() });
  return `🔀 *WORD SCRAMBLE*\n\n❓ Arrange this word:\n\n*${scrambled.toUpperCase()}*\n\n_${word.length} letters — type your answer!_`;
}

export function startTebakKata(jid) {
  const item = rand(WORD_HINTS);
  activeGames.set(jid, { type: "tebakkata", answer: item.word, startedAt: Date.now() });
  return `🔍 *GUESS THE WORD*\n\n💡 Hint: ${item.hint}\n\n_${item.word.length} letters — type your answer!_`;
}

export function startTebakBendera(jid) {
  const item = rand(FLAGS);
  activeGames.set(jid, { type: "tebakbendera", answer: item.country, alt: item.alt, startedAt: Date.now() });
  return `🚩 *GUESS THE FLAG*\n\n${item.emoji}\n\n_What country is this flag from?_`;
}

export function hasActiveGame(jid) { return activeGames.has(jid); }

export function checkAnswer(jid, input) {
  if (!activeGames.has(jid)) return null;
  const game = activeGames.get(jid);
  const clean = input.trim().toLowerCase();

  let correct = false;
  if (game.type === "math") correct = clean === game.answer;
  else if (game.type === "susunkata") correct = clean === game.answer.toLowerCase();
  else if (game.type === "tebakkata") correct = clean === game.answer.toLowerCase();
  else if (game.type === "tebakbendera") {
    correct = clean === game.answer.toLowerCase() ||
      (game.alt || []).some(a => clean === a.toLowerCase());
  }

  if (correct) {
    const time = ((Date.now() - game.startedAt) / 1000).toFixed(1);
    activeGames.delete(jid);
    return { correct: true, answer: game.answer, time };
  }
  return { correct: false };
}

export function stopGame(jid) {
  const game = activeGames.get(jid);
  activeGames.delete(jid);
  return game?.answer || null;
}
