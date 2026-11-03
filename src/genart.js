// genart.js: shared helpers for every piece. Plain ES module, no dependencies.
// Built into each piece's dist file by scripts/build.mjs (exports are stripped there).

// ---- themes ---------------------------------------------------------------
export const THEMES = {
  mono: { paper: '#E4E2DD', ink: '#1B1A18' },
  fieldnotes: { paper: '#E9E8E3', ink: '#141518', accent: '#A8521F', cool: '#3F6688' },
  night: { paper: '#121316', ink: '#EAE7E0', accent: '#D98552', cool: '#8FB0CF' },
};
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
export function theme(name) {
  const t = THEMES[name] || THEMES.mono;
  return { paper: t.paper, ink: t.ink, accent: t.accent || t.ink, cool: t.cool || t.ink,
    tint1: mix(t.paper, t.ink, 0.35), tint2: mix(t.paper, t.ink, 0.12) };
}

// ---- prng: sfc32 seeded through cyrb128 ------------------------------------
export function cyrb128(s) {
  let a = 1779033703, b = 3144134277, c = 1013904242, d = 2773480762;
  for (let i = 0, k; i < s.length; i++) {
    k = s.charCodeAt(i);
    a = b ^ Math.imul(a ^ k, 597399067); b = c ^ Math.imul(b ^ k, 2869860233);
    c = d ^ Math.imul(c ^ k, 951274213); d = a ^ Math.imul(d ^ k, 2716044179);
  }
  a = Math.imul(c ^ (a >>> 18), 597399067); b = Math.imul(d ^ (b >>> 22), 2869860233);
  c = Math.imul(a ^ (c >>> 17), 951274213); d = Math.imul(b ^ (d >>> 19), 2716044179);
  return [(a ^ b ^ c ^ d) >>> 0, (b ^ a) >>> 0, (c ^ a) >>> 0, (d ^ a) >>> 0];
}
export function sfc32(a, b, c, d) {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
export function prng(seed) { const r = sfc32(...cyrb128(String(seed))); for (let i = 0; i < 12; i++) r(); return r; }

// ---- noise: simplex 4D, loop noise ----------------------------------------
const PERM = new Uint8Array(512), GRAD = [];
{ const r = prng('genart-noise'), a = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = a[i & 255];
  for (let z = 0; z < 4; z++) for (const p of [-1, 1]) for (const q of [-1, 1]) for (const s of [-1, 1]) { const v = [p, q, s]; v.splice(z, 0, 0); GRAD.push(v); } }
const F4 = (Math.sqrt(5) - 1) / 4, G4 = (5 - Math.sqrt(5)) / 20;
export function noise4(x, y, z, w) { // about [-1, 1]
  const s = (x + y + z + w) * F4, c0 = [x, y, z, w].map(v => Math.floor(v + s)), t = (c0[0] + c0[1] + c0[2] + c0[3]) * G4;
  const X = [x, y, z, w].map((v, i) => v - (c0[i] - t)), rk = [0, 0, 0, 0];
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) X[a] > X[b] ? rk[a]++ : rk[b]++;
  let n = 0;
  for (let c = 0; c < 5; c++) {
    const o = rk.map(v => (c && v >= 4 - c ? 1 : 0)), d = X.map((v, i) => v - o[i] + c * G4);
    const u = 0.6 - d[0] * d[0] - d[1] * d[1] - d[2] * d[2] - d[3] * d[3];
    if (u > 0) {
      const P = (i) => PERM[i & 255], gv = GRAD[P(c0[0] + o[0] + P(c0[1] + o[1] + P(c0[2] + o[2] + P(c0[3] + o[3])))) & 31];
      n += u * u * u * u * (gv[0] * d[0] + gv[1] * d[1] + gv[2] * d[2] + gv[3] * d[3]);
    }
  }
  return 27 * n;
}
export const loopNoise = (x, y, th, r) => noise4(x, y, r * Math.cos(th), r * Math.sin(th));

// ---- easing: only these two are allowed ----------------------------------
const cl = u => Math.min(1, Math.max(0, u));
export const ease = {
  sine: u => 0.5 - 0.5 * Math.cos(Math.PI * cl(u)),
  smoother: u => { u = cl(u); return u * u * u * (u * (u * 6 - 15) + 10); },
  // tempo curve, no rests: a phase that runs between 0.5x and 1.5x of the average speed and never stops
  rest: p => p + Math.sin(2 * Math.PI * p) / (4 * Math.PI),
  // breathing amplitude 0..1 over one loop (cosine of the tempo-varied phase)
  breath: p => 0.5 - 0.5 * Math.cos(2 * Math.PI * ease.rest(p)),
};

// ---- frame: unit transform, paper, line weights ---------------------------
const LW = { hair: 0.0006, fine: 0.0012, line: 0.0025, bold: 0.006, mass: 0.02 };
export function frame(ctx, { w, h, seed = 1, theme: tn = 'mono', q = 1 }) {
  const S = Math.min(w, h), aspect = Math.max(w, h) / S, c = theme(tn), m = aspect > 1.5 ? 0.06 : 0.08;
  const hw = w / S / 2, hh = h / S / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = c.paper; ctx.fillRect(0, 0, w, h);
  ctx.setTransform(S, 0, 0, S, w / 2, h / 2); ctx.lineCap = ctx.lineJoin = 'round';
  const lw = n => Math.max(LW[n], 0.75 / S);
  // g.q: quality factor in (0, 1]. 1 in tests, exports and ?t= frames; mount's governor lowers it on slow devices.
  // Heavy pieces multiply their element counts (segments, particles, dots) by g.q, rounding up to at least a sensible minimum.
  return { S, aspect, w, h, hw, hh, m, bx: hw - m, by: hh - m, c, seed, lw, q,
    // pen: set stroke width (floored at 0.75 device px, alpha scaled to keep tone), alpha and colour
    pen(ctx, n, a = 1, col = c.ink) { ctx.lineWidth = lw(n); ctx.globalAlpha = a * Math.min(1, LW[n] / lw(n)); ctx.strokeStyle = col; },
    rng: salt => prng(seed + ':' + (salt || '')), noise4, ease };
}

// ---- paper: two static grain tiles + dust (spec: grain; baked under the marks for speed) ----
const TILES = {}, GK = 2.6; // GK scales the spec alphas: soft-light on bright paper is weak, this lands at std 2 to 5
function tile(n, seed, amp) {
  const k = n + seed; if (TILES[k]) return TILES[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  const x = cv.getContext('2d'), im = x.createImageData(n, n), r = prng('grain' + k);
  for (let i = 0; i < n * n; i++) im.data.set([0, 0, 0, 255].fill(128 + (r() * 2 - 1) * amp, 0, 3), i * 4);
  x.putImageData(im, 0, 0); return (TILES[k] = cv);
}
// The paper (fill, dust, grain) is static, so it is built once per (seed, size, theme) and blitted each frame.
const PAPER = new Map();
function paper(g) {
  const k = [g.seed, g.w, g.h, g.c.paper].join('|');
  if (PAPER.has(k)) return PAPER.get(k);
  const cv = document.createElement('canvas'); cv.width = g.w; cv.height = g.h;
  const ctx = cv.getContext('2d'), r = g.rng('dust'), n = (r() * 41) | 0;
  ctx.fillStyle = g.c.paper; ctx.fillRect(0, 0, g.w, g.h); ctx.fillStyle = g.c.ink;
  for (let i = 0; i < n; i++) { ctx.globalAlpha = 0.3 + 0.4 * r(); ctx.beginPath(); ctx.arc(r() * g.w, r() * g.h, g.S * (0.0004 + 0.0008 * r()), 0, 7); ctx.fill(); }
  const k0 = Math.max(1, g.S / 1000); ctx.globalCompositeOperation = 'soft-light';
  [[241, 1, 0.10 * GK], [257, 3, 0.06 * GK]].forEach(([sz, m, a]) => {
    const p = ctx.createPattern(tile(sz, g.seed, 127), 'repeat'); p.setTransform(new DOMMatrix().scale(k0 * m));
    ctx.globalAlpha = a; ctx.fillStyle = p; ctx.fillRect(0, 0, g.w, g.h);
  });
  if (PAPER.size > 6) PAPER.delete(PAPER.keys().next().value);
  PAPER.set(k, cv); return cv;
}

// ---- render: the one place that turns (piece, seed, t, size, theme) into pixels ---
export function render(piece, ctx, o) {
  const g = setup(piece, ctx, o);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper(g), 0, 0); ctx.restore();
  piece.draw(ctx, { seed: o.seed, t: o.t, w: o.w, h: o.h, g });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
}
// setup: the frame helper plus phase, noise and live-mode helpers (also used headless by scripts/motion.mjs)
export function setup(piece, ctx, o) {
  const g = frame(ctx, o), T = piece.meta.T;
  g.params = { ...piece.meta.params, ...o.params };
  g.T = T; g.p = (((o.t / T) % 1) + 1) % 1; g.theta = 2 * Math.PI * g.p;
  g.thetaR = 2 * Math.PI * ease.rest(g.p); // theta with varying tempo (0.5x..1.5x), never stops
  // Live mode (mount default; exports, ?t= frames, tests and ?loop=1 stay in loop mode, where drift = 0 and everything closes at T):
  //  g.live   true in live mode.
  //  g.drift  unbounded slow time in seconds (page clock); 0 in loop mode. Use it for slow envelopes that should never recur.
  //  g.voice(k) loop mode: k * theta (integer k >= 1, closes). Live: 2*pi*(t/T)*(k + eps_k) unwrapped, with small detunes so
  //           voices slip against each other and the combination never repeats.
  //  g.loop(x, y, r, th) loop noise; live: the sampling circle's centre wanders slowly through noise space, so fields never recur.
  g.live = !!o.live; g.drift = g.live ? o.t : 0;
  const EPS = [0, 0.0618, 0.1414, 0.0732, 0.0236, 0.1032, 0.0455, 0.0871];
  g.voice = k => g.live ? 2 * Math.PI * (o.t / T) * (k + (EPS[k - 1] ?? ((k * 0.618034) % 1) * 0.1)) : k * g.theta;
  const D = [0.37, 0.61, 0.43, 0.29].map(v => v * 0.03 * g.drift);
  g.loop = (x, y, r, th = g.theta) => g.live ? noise4(x + D[0], y + D[1], r * Math.cos(th) + D[2], r * Math.sin(th) + D[3]) : loopNoise(x, y, th, r);
  return g;
}

// ---- clock: rAF loop with pause and resume ------
export function clock(fn) {
  let raf = 0;
  const loop = ts => { raf = requestAnimationFrame(loop); fn(ts / 1000); };
  return { start() { if (!raf) raf = requestAnimationFrame(loop); }, stop() { cancelAnimationFrame(raf); raf = 0; }, get running() { return !!raf; } };
}

// ---- mount: responsive, pauses offscreen, honours reduced motion -----------
export function mount(el, o) {
  const { piece } = o, m = piece.meta, seed = o.seed ?? 1, tn = o.theme || 'mono';
  const [aw, ah] = (o.aspect || m.aspects[0]).split(':').map(Number), ar = aw / ah;
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', m.label);
  cv.style.cssText = `display:block;border:0;background:${theme(tn).paper};` + (o.fit ? '' : `width:100%;aspect-ratio:${aw}/${ah}`);
  el.appendChild(cv);
  const inst = { canvas: cv, frames: 0, q: 1, qSteps: 0, drawMs: [], destroy }; // drawMs: cost of the last 600 live paints (draw+frame, CPU side)
  const mql = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => (o.reduce ?? mql.matches);
  let vis = true, lastT = 0, lastLive = false, sized = false, key = '';
  const paint = (t, again, live) => { // static modes skip a repaint of an identical frame
    const k = cv.width + 'x' + cv.height + ':' + t; if (!sized || (!again && k === key)) return; key = k; lastT = t; lastLive = live; render(piece, ctx, { seed, t, w: cv.width, h: cv.height, theme: tn, params: o.params, q: gov.q, live }); inst.frames++; };
  // Quality governor (live clock only; never for exports or ?t= frames). Rolling mean over 30 frames of (a) the cost of
  // draw+frame and (b) the rAF interval. Mean cost > 12 ms or interval > 22 ms: step g.q down one level of [1, .7, .5, .35].
  // Mean cost < 6 ms and interval < 18 ms for 3 consecutive windows (90 frames): step back up one level.
  const gov = { q: o.q ?? 1, target: o.q ?? 1, L: [1, 0.7, 0.5, 0.35], i: 0, n: 0, cost: 0, gap: 0, bad: 0, good: 0, last: 0, stepAt: 0 };
  // Live clock ACCUMULATES: tAcc += clamp(dt, 0, 0.05) * speed, with dt from rAF timestamps and speed = inst.speed * meta.speed.
  // Changing the speed never changes the phase (no jump), and a stall or a pause becomes a slight slowdown, never a visual jump.
  // The live t (= tAcc, unbounded) starts at meta.start * T and feeds g.drift / g.voice.
  inst.speed = o.speed ?? 1; let tAcc = (m.start ?? 0.25) * m.T, lastTs = 0;
  // Quality governor (live clock only; never for exports or ?t= frames). Windows of 30 frames of (a) the cost of draw+frame and
  // (b) the rAF interval. Down one level of [1, .7, .5, .35] after 2 consecutive overloaded windows, about 1 s (cost > 10 ms or interval > 22 ms);
  // up after 3 consecutive good windows (cost < 5 ms and interval < 18 ms) and at least 5 s since the last step. g.q itself eases toward the
  // target level (about 1 s), so element counts fade rather than pop.
  const govern = (cost, now) => {
    const gap = gov.last && now - gov.last < 100 ? now - gov.last : 0; gov.last = now;
    gov.cost += cost; gov.gap += gap || 16;
    if (o.q == null) gov.q += (gov.target - gov.q) * 0.06;
    inst.q = gov.q;
    if (++gov.n < 30) return;
    const c = gov.cost / 30, d = gov.gap / 30; gov.n = gov.cost = gov.gap = 0;
    const bad = c > 10 || d > 22, good = c < 5 && d < 18; gov.bad = bad ? gov.bad + 1 : 0; gov.good = good ? gov.good + 1 : 0;
    if (gov.bad >= 2 && gov.i < 3 && now - gov.stepAt > 1500) { gov.i++; inst.qSteps++; gov.stepAt = now; gov.bad = 0; } else if (gov.good >= 3 && gov.i > 0 && now - gov.stepAt > 5000) { gov.i--; inst.qSteps++; gov.stepAt = now; gov.good = 0; }
    gov.target = gov.L[gov.i];
  };
  const clk = clock(ts => {
    const t0 = performance.now(); tAcc += Math.min(0.05, Math.max(0, lastTs ? ts - lastTs : 0)) * inst.speed * (m.speed ?? 1); lastTs = ts;
    paint(tAcc, 1, !o.loop); const cost = performance.now() - t0; inst.drawMs.push(cost); if (inst.drawMs.length > 600) inst.drawMs.shift(); govern(cost, t0);
  });
  function update() {
    if (o.t != null) { clk.stop(); paint(o.t); }
    else if (reduced()) { clk.stop(); paint(m.still * m.T); }
    else if (vis && !document.hidden) { if (!clk.running) lastTs = 0; clk.start(); } else clk.stop();
    cv.dataset.state = clk.running ? 'running' : 'paused';
  }
  const ro = new ResizeObserver(([e]) => {
    const { width, height } = e.contentRect; if (!width) return;
    const cw = o.fit ? Math.min(width, height * ar) : width, ch = cw / ar;
    if (o.fit) { cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; }
    const liveMode = o.t == null && !reduced() && !o.loop, k = Math.min(devicePixelRatio || 1, liveMode ? (o.dprMax ?? m.dprMax ?? 2) : 2); // meta.dprMax: heavy pieces ask for DPR 1 in live mode
    let pw = cw * k; if (pw * (pw / ar) > 2.5e6) pw = Math.sqrt(2.5e6 * ar);
    const nw = Math.round(pw), nh = Math.round(pw / ar); if (cv.width === nw && cv.height === nh && sized) return; // no needless clear
    cv.width = nw; cv.height = nh; sized = true; update(); if (lastT || !clk.running) paint(lastT, 0, lastLive); // repaint in the same task: no blank frame is ever composited
  });
  const io = new IntersectionObserver(es => { vis = es[es.length - 1].isIntersecting; update(); });
  const onVis = () => update();
  ro.observe(el); io.observe(cv); document.addEventListener('visibilitychange', onVis); mql.addEventListener('change', onVis);
  function destroy() { clk.stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); mql.removeEventListener('change', onVis); cv.remove(); }
  return inst;
}

// ---- exports ---------------------------------------------------------------
function target(piece, o) {
  const [aw, ah] = (o.aspect || piece.meta.aspects[0]).split(':').map(Number), [w, h] = String(o.size || 2000).split('x').map(Number);
  return { w, h: h || Math.round(w * ah / aw) };
}
const canvasFor = (piece, o) => { const cv = document.createElement('canvas'); Object.assign(cv, target(piece, o)); return cv; };
const opts = (piece, o, cv, t) => ({ seed: o.seed ?? 1, theme: o.theme || 'mono', params: o.params, w: cv.width, h: cv.height, t });
const blobOf = (cv, type = 'image/png') => new Promise(r => cv.toBlob(r, type));
export function exportPNG(piece, o = {}) { // the reduced-motion frame, at full size
  const cv = canvasFor(piece, o); render(piece, cv.getContext('2d'), opts(piece, o, cv, piece.meta.still * piece.meta.T)); return blobOf(cv);
}
export async function exportWebm(piece, o = {}, fps = 30) { // one seamless loop, real-time capture
  const cv = canvasFor(piece, o), ctx = cv.getContext('2d'), track = cv.captureStream(0).getVideoTracks()[0];
  const rec = new MediaRecorder(new MediaStream([track]), { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm', videoBitsPerSecond: 12e6 });
  const parts = []; rec.ondataavailable = e => parts.push(e.data); rec.start();
  for (let i = 0; i < piece.meta.T * fps; i++) { render(piece, ctx, opts(piece, o, cv, i / fps)); track.requestFrame(); await new Promise(r => setTimeout(r, 1000 / fps)); }
  await new Promise(r => { rec.onstop = r; rec.stop(); }); return new Blob(parts, { type: 'video/webm' });
}
export async function exportFrames(piece, o = {}, fps = 30) { // needs a user gesture for the folder picker
  const dir = await showDirectoryPicker(), cv = canvasFor(piece, o), ctx = cv.getContext('2d');
  for (let i = 0; i < piece.meta.T * fps; i++) {
    render(piece, ctx, opts(piece, o, cv, i / fps));
    const f = await (await dir.getFileHandle(`frame_${String(i).padStart(5, '0')}.png`, { create: true })).createWritable();
    await f.write(await blobOf(cv)); await f.close();
  }
}
export function save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1e4); }
