// Learning state in localStorage only. Everything is wrapped, storage can be missing or blocked.
const KEY = 'ekg-trainer-v1';
const DAY = 86400000;
const BOX_DAYS = [0, 1, 3, 7, 21, 60];

let mem = { cases: {}, log: [] };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = JSON.parse(raw);
  } catch (e) {
    /* keep in-memory state */
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch (e) {
    /* ignore */
  }
}
load();

export function record(id, pct, mode) {
  const c = mem.cases[id] ?? { box: 0, due: 0, seen: 0, sum: 0 };
  c.seen += 1;
  c.sum += pct;
  c.box = pct >= 80 ? Math.min(BOX_DAYS.length - 1, c.box + 1) : pct >= 50 ? c.box : 0;
  c.due = Date.now() + BOX_DAYS[c.box] * DAY;
  c.last = pct;
  mem.cases[id] = c;
  mem.log.push({ id, pct, mode, t: Date.now() });
  if (mem.log.length > 500) mem.log.shift();
  save();
}

export function stats() {
  const done = mem.log.length;
  const avg = done ? Math.round(mem.log.reduce((s, l) => s + l.pct, 0) / done) : 0;
  const due = Object.values(mem.cases).filter((c) => c.due <= Date.now()).length;
  return { done, avg, due, cases: mem.cases };
}

// Weighted pick: unseen and due cases come first, strong cases rarely.
export function pick(pool, avoidId) {
  const now = Date.now();
  const w = pool.map((s) => {
    if (s.id === avoidId && pool.length > 1) return 0;
    const c = mem.cases[s.id];
    if (!c) return 4;
    if (c.due <= now) return 5 - Math.min(3, c.box);
    return 0.4;
  });
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function exportJson() {
  return JSON.stringify(mem, null, 1);
}
export function reset() {
  mem = { cases: {}, log: [] };
  save();
}
