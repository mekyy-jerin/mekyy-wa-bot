// In-memory group settings store
const store = new Map();

const defaults = () => ({
  welcome: false,
  welcomeMsg: "Welcome to the group, {user}! 👋",
  goodbye: false,
  goodbyeMsg: "Goodbye {user}, we'll miss you! 👋",
  antibot: false,
  anticall: false,
  mute: false,
  desc: "",
});

export function getSettings(jid) {
  if (!store.has(jid)) store.set(jid, defaults());
  return store.get(jid);
}

export function setSetting(jid, key, value) {
  const s = getSettings(jid);
  s[key] = value;
  store.set(jid, s);
}

export function isAntibot(jid) { return getSettings(jid).antibot; }
export function isAnticall(jid) { return getSettings(jid).anticall; }
export function isMuted(jid) { return getSettings(jid).mute; }
