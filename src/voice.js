// Browser side of the oral reading mode: recording, transcription and evaluation through the server functions.
const CODE_KEY = 'ekg-code';

export function getCode() {
  try {
    return localStorage.getItem(CODE_KEY) || '';
  } catch (e) {
    return '';
  }
}
export function setCode(v) {
  try {
    localStorage.setItem(CODE_KEY, v);
  } catch (e) {
    /* ignore */
  }
}

function headers(extra = {}) {
  const h = { ...extra };
  const c = getCode();
  if (c) h['x-access-code'] = c;
  return h;
}

async function parse(r) {
  let j = {};
  try {
    j = await r.json();
  } catch (e) {
    /* not json */
  }
  if (!r.ok) {
    const err = new Error(j.message || `Serverfehler ${r.status}`);
    err.kind = j.error || 'http';
    throw err;
  }
  return j;
}

export async function apiStatus() {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

export async function transcribe(blob) {
  const r = await fetch('/api/transcribe', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/octet-stream', 'x-audio-type': blob.type || 'audio/webm' }),
    body: blob,
  });
  return (await parse(r)).text;
}

export async function evaluate(payload) {
  const r = await fetch('/api/evaluate', {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return (await parse(r)).bewertung;
}

export const MAX_SECONDS = 180;

export function micSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function pickType() {
  const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return list.find((t) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(t)) || '';
}

// Records until stop() is called or MAX_SECONDS pass. onLevel gets values 0..1, onTick elapsed seconds.
export async function startRecording({ onLevel, onTick, onAutoStop }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const type = pickType();
  const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);

  let ctx = null;
  let raf = 0;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
      onLevel && onLevel(Math.min(1, peak / 80));
      raf = requestAnimationFrame(loop);
    };
    loop();
  } catch (e) {
    /* no meter, recording still works */
  }

  const t0 = Date.now();
  const timer = setInterval(() => {
    const s = (Date.now() - t0) / 1000;
    onTick && onTick(s);
    if (s >= MAX_SECONDS) {
      onAutoStop && onAutoStop();
    }
  }, 250);

  const done = new Promise((resolve) => {
    rec.onstop = () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      if (ctx) ctx.close().catch(() => {});
      resolve(new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' }));
    };
  });
  rec.start(1000);
  return {
    stop() {
      if (rec.state !== 'inactive') rec.stop();
      return done;
    },
  };
}
