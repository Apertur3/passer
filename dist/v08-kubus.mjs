// genart.js: shared helpers for every piece. Plain ES module, no dependencies.
// Built into each piece's dist file by scripts/build.mjs (exports are stripped there).

// ---- themes ---------------------------------------------------------------
const THEMES = {
  mono: { paper: '#E4E2DD', ink: '#1B1A18' },
  fieldnotes: { paper: '#E9E8E3', ink: '#141518', accent: '#A8521F', cool: '#3F6688', third: '#3D8A6E' },
  night: { paper: '#121316', ink: '#EAE7E0', accent: '#D98552', cool: '#8FB0CF', third: '#6CC0A0' },
};
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
function theme(name) {
  const t = THEMES[name] || THEMES.mono;
  return { paper: t.paper, ink: t.ink, accent: t.accent || t.ink, cool: t.cool || t.ink, third: t.third || t.ink,
    tint1: mix(t.paper, t.ink, 0.35), tint2: mix(t.paper, t.ink, 0.12) };
}

// ---- prng: sfc32 seeded through cyrb128 ------------------------------------
function cyrb128(s) {
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
function sfc32(a, b, c, d) {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
function prng(seed) { const r = sfc32(...cyrb128(String(seed))); for (let i = 0; i < 12; i++) r(); return r; }

// ---- noise: simplex 4D, loop noise ----------------------------------------
const PERM = new Uint8Array(512), GRAD = [];
{ const r = prng('genart-noise'), a = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = a[i & 255];
  for (let z = 0; z < 4; z++) for (const p of [-1, 1]) for (const q of [-1, 1]) for (const s of [-1, 1]) { const v = [p, q, s]; v.splice(z, 0, 0); GRAD.push(v); } }
const F4 = (Math.sqrt(5) - 1) / 4, G4 = (5 - Math.sqrt(5)) / 20;
function noise4(x, y, z, w) { // about [-1, 1]
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
const loopNoise = (x, y, th, r) => noise4(x, y, r * Math.cos(th), r * Math.sin(th));

// ---- easing: only these two are allowed ----------------------------------
const cl = u => Math.min(1, Math.max(0, u));
const ease = {
  sine: u => 0.5 - 0.5 * Math.cos(Math.PI * cl(u)),
  smoother: u => { u = cl(u); return u * u * u * (u * (u * 6 - 15) + 10); },
  // tempo curve, no rests: a phase that runs between 0.5x and 1.5x of the average speed and never stops
  rest: p => p + Math.sin(2 * Math.PI * p) / (4 * Math.PI),
  // breathing amplitude 0..1 over one loop (cosine of the tempo-varied phase)
  breath: p => 0.5 - 0.5 * Math.cos(2 * Math.PI * ease.rest(p)),
};

// ---- frame: unit transform, paper, line weights ---------------------------
const LW = { hair: 0.0006, fine: 0.0012, line: 0.0025, bold: 0.006, mass: 0.02 };
function frame(ctx, { w, h, seed = 1, theme: tn = 'mono', q = 1 }) {
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
  for (let i = 0; i < n; i++) { ctx.globalAlpha = 0.15 + 0.25 * r(); ctx.beginPath(); ctx.arc(r() * g.w, r() * g.h, g.S * (0.0003 + 0.0002 * r()), 0, 7); ctx.fill(); } // owner: large dark specks must go: tiny and faint only
  const k0 = Math.max(1, g.S / 1000); ctx.globalCompositeOperation = 'soft-light';
  [[241, 1, 0.10 * GK], [257, 3, 0.06 * GK]].forEach(([sz, m, a]) => {
    const p = ctx.createPattern(tile(sz, g.seed, 127), 'repeat'); p.setTransform(new DOMMatrix().scale(k0 * m));
    ctx.globalAlpha = a; ctx.fillStyle = p; ctx.fillRect(0, 0, g.w, g.h);
  });
  if (PAPER.size > 6) PAPER.delete(PAPER.keys().next().value);
  PAPER.set(k, cv); return cv;
}

// ---- render: the one place that turns (piece, seed, t, size, theme) into pixels ---
function render(piece, ctx, o) {
  const g = setup(piece, ctx, o);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(paper(g), 0, 0); ctx.restore();
  piece.draw(ctx, { seed: o.seed, t: o.t, w: o.w, h: o.h, g });
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
}
// setup: the frame helper plus phase, noise and live-mode helpers (also used headless by scripts/motion.mjs)
function setup(piece, ctx, o) {
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
function clock(fn) {
  let raf = 0;
  const loop = ts => { raf = requestAnimationFrame(loop); fn(ts / 1000); };
  return { start() { if (!raf) raf = requestAnimationFrame(loop); }, stop() { cancelAnimationFrame(raf); raf = 0; }, get running() { return !!raf; } };
}

// ---- mount: responsive, pauses offscreen, honours reduced motion -----------
function mount(el, o) {
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
function exportPNG(piece, o = {}) { // the reduced-motion frame, at full size
  const cv = canvasFor(piece, o); render(piece, cv.getContext('2d'), opts(piece, o, cv, piece.meta.still * piece.meta.T)); return blobOf(cv);
}
async function exportWebm(piece, o = {}, fps = 30) { // one seamless loop, real-time capture
  const cv = canvasFor(piece, o), ctx = cv.getContext('2d'), track = cv.captureStream(0).getVideoTracks()[0];
  const rec = new MediaRecorder(new MediaStream([track]), { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm', videoBitsPerSecond: 12e6 });
  const parts = []; rec.ondataavailable = e => parts.push(e.data); rec.start();
  for (let i = 0; i < piece.meta.T * fps; i++) { render(piece, ctx, opts(piece, o, cv, i / fps)); track.requestFrame(); await new Promise(r => setTimeout(r, 1000 / fps)); }
  await new Promise(r => { rec.onstop = r; rec.stop(); }); return new Blob(parts, { type: 'video/webm' });
}
async function exportFrames(piece, o = {}, fps = 30) { // needs a user gesture for the folder picker
  const dir = await showDirectoryPicker(), cv = canvasFor(piece, o), ctx = cv.getContext('2d');
  for (let i = 0; i < piece.meta.T * fps; i++) {
    render(piece, ctx, opts(piece, o, cv, i / fps));
    const f = await (await dir.getFileHandle(`frame_${String(i).padStart(5, '0')}.png`, { create: true })).createWritable();
    await f.write(await blobOf(cv)); await f.close();
  }
}
function save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1e4); }

// V08 Kubus (Escher's cube world: a heap of cubes that only ever grows).
// One rule: a heap of isometric cubes is a plane partition (heights fall away from the corner); cubes are only added, one whole cube at a time at a free corner, and the view slowly pulls back so the heap always fits the page.
const meta = {
  id: 'v08-kubus', pencils: true, title: 'Kubus', nl: 'Kubusstapeling', T: 64, still: 0.6, start: 0.1, aspects: ['4:5', '16:9', '1:1'],
  math: 'h(i,j) in 0..24, h(i,j) >= h(i+1,j), h(i,j) >= h(i,j+1); each visible face is a rhombus of the lozenge tiling; a flip of three rhombi adds one cube; hatching is dyadic, level l adds the lines at odd multiples of 2^-(l+1)',
  label: 'A heap of isometric cubes drawn in pencil, three tones of hatching on the three face directions; cubes are only added, one at a time, and the view pulls back so the growing heap, with its terraces and towers, stays in frame.',
  // construction: 1 draws the faint circle and axes behind the heap
  params: { construction: 0 },
};

const TAU = 2 * Math.PI, C30 = Math.sqrt(3) / 2, MEMO = {}, DUR = 1.35, RISE = 2.2, M = 24, KMAX = 700, SEAM = 28, OFF = 0.25, TC = 6, STEP = 0.7;
const near = (a, b) => Math.abs(((a / M) | 0) - ((b / M) | 0)) <= 1 && Math.abs(a % M - b % M) <= 1;
const canAdd = (h, c) => { const i = (c / M) | 0, j = c % M; return h[c] < M && (!i || h[c - M] > h[c]) && (!j || h[c - 1] > h[c]); };
// bounding box of the heap in units of a cube edge: centre, half width, half height
const bbox = h => {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (let k = 0; k < M * M; k++) if (h[k]) { const i = (k / M) | 0, j = k % M; a = Math.min(a, i - j - 1); b = Math.max(b, i + 1 - j); c = Math.min(c, (i + j) / 2 - h[k]); d = Math.max(d, (i + j + 2) / 2); }
  return a > b ? [0, 0, 1, 1] : [(a + b) / 2 * C30, (c + d) / 2, (b - a) / 2 * C30 + 0.3, (d - c) / 2 + 0.8];
};
// a pile that tends to a terraced pyramid: free corners near the back corner and low down are likelier; now and then a tower
function grow(h, j, r, rec) {
  const lam = 1.6 + 0.9 * Math.cbrt(j + 10), C = [], W = []; let tot = 0, tall = -1;
  for (let c = 0; c < M * M; c++) if (canAdd(h, c)) { const w = Math.exp(-(((c / M) | 0) + c % M + 1.7 * h[c] + 0.8 * Math.abs(((c / M) | 0) - c % M)) / lam) * (rec.some(d => near(c, d)) ? 0.02 : 1); C.push(c); W.push(w); tot += w; if (h[c] < 5 && h[c] > (tall < 0 ? -1 : h[C[tall]])) tall = C.length - 1; }
  if (r() < 0.06 && tall >= 0 && W[tall] > 0.2 * tot / C.length) return C[tall];
  let x = r() * tot, k = 0; while (k < C.length - 1 && (x -= W[k]) > 0) k++; return C[k];
}
// move tables, pure in (seed, epoch): H[j] = heights after j moves, mv[j] = the j-th move, B[j] = its bounding box
function table(g, e, K) {
  const key = g.seed + '|' + e + '|' + K; if (MEMO[key]) return MEMO[key];
  let h = new Uint8Array(M * M); const r0 = g.rng('s' + e), tb = { H: [h], mv: [], B: [], K };
  for (let k = 0; k < 6; k++) { h = h.slice(); h[grow(h, 0, r0, [])]++; } tb.H[0] = h; tb.B[0] = bbox(h);
  tb.ensure = m => { m = Math.min(m, K); while (tb.mv.length < m) { const j = tb.mv.length, h = tb.H[j], c = grow(h, j, g.rng('g' + e + ',' + j), tb.mv.slice(-4).map(q => q.c)), h2 = h.slice(); h2[c]++; tb.mv.push({ c, lvl: h2[c] - 1 }); tb.H.push(h2); tb.B.push(bbox(h2)); } };
  const ks = Object.keys(MEMO); if (ks.length > 6) delete MEMO[ks[0]];
  return (MEMO[key] = tb);
}

// one epoch of the heap at time tau (seconds since its start), drawn at global alpha ga
function pile(g, c, tb, tau, ga, live) {
  const sj = j => OFF + j * STEP + (live ? 0.18 * STEP * Math.sin(1.9 * j + 0.7) : 0), K = tb.K, sm = g.ease.smoother;
  let m = Math.max(0, Math.floor((tau - OFF) / STEP)); while (sj(m) <= tau) m++; while (m > 0 && sj(m - 1) > tau) m--; m = Math.min(m, K); tb.ensure(m + 6);
  const fl = []; for (let j = m - 4; j < m; j++) if (j >= 0) { const q = (tau - sj(j)) / DUR; if (q < 1) fl.push({ ...tb.mv[j], q }); }
  const Hs = tb.H[m].slice(); fl.forEach(f => Hs[f.c]--);
  // the camera: a box filter over the heap's size nine moves wide, so the pull-back is smooth
  const cam = j => { let a = 0, b = 0, d = 0, n = 0; for (let k = Math.max(0, j - 4); k <= Math.min(tb.mv.length, j + 4); k++) { const B = tb.B[k]; a += Math.log(Math.min(g.bx / B[2], g.by / B[3])); b += B[0]; d += B[1]; n++; } return [a / n, b / n, d / n]; };
  const mu = Math.min(K, Math.max(0, (tau - OFF) / STEP + 1)), j0 = Math.floor(mu), f0 = mu - j0, c0 = cam(j0), c1 = cam(Math.min(K, j0 + 1));
  const u = Math.min(0.17, Math.exp(c0[0] + (c1[0] - c0[0]) * f0) * 0.92), cx = c0[1] + (c1[1] - c0[1]) * f0, cy = c0[2] + (c1[2] - c0[2]) * f0, ink = g.c.ink;
  const px = C30 * u * g.S, fade = l => sm((px / 2 ** (l + 1) - 2.6) / 1.6), FL = [0, 1, 2, 3].map(fade); // hatch level l is drawn once its own spacing passes about 3 px
  const flat = Math.max(0, 1 - FL[1]), fe = sm((u * g.S - 2) / 5); // below that the faces turn into tone fills; cube edges fade out last
  const ex = [C30 * u, 0.5 * u], ey = [-C30 * u, 0.5 * u], ez = [0, -u], lk = (x, y, z) => (x - y + 64) * 256 + (x + y - 2 * z + 64), CAP = [2, 3, 3];
  const mkL = () => ({ b: Array.from({ length: 12 }, () => []), p: [[], [], []], em: new Map() });
  const face = (L, ty, x, y, z, dz) => {
    const O = [((x - y) * C30 - cx) * u, ((x + y) / 2 - z - dz - cy) * u], A = ty === 1 ? ey : ex, B = ty === 0 ? ey : ez, at = (s, t) => [O[0] + s * A[0] + t * B[0], O[1] + s * A[1] + t * B[1]];
    const cr = ty === 0 ? [[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]] : ty === 1 ? [[x, y, z], [x, y + 1, z], [x, y + 1, z + 1], [x, y, z + 1]] : [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]], P = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
    for (let k = 0; k < 4; k++) { const a = lk(...cr[k]), b = lk(...cr[(k + 1) % 4]), q = P[(k + 1) % 4]; L.em.set(a < b ? a * 32768 + b : b * 32768 + a, [P[k][0], P[k][1], q[0], q[1]]); }
    if (flat > 0.01) L.p[ty].push(P);
    for (let l = 0; l <= CAP[ty]; l++) if (FL[l] > 0.01) for (let k = 0; k < 2 ** l; k++) { // dyadic hatching: level l adds the odd multiples of 2^-(l+1), so lines never creep
      const f = (2 * k + 1) / 2 ** (l + 1), bk = L.b[ty * 4 + l], s0 = 0.05, s1 = 0.95;
      if (ty === 0) bk.push(...at(s0, f), ...at(s1, f)); else bk.push(...at(f, s0), ...at(f, s1));
      if (ty === 2 && l < 3) { const cc = -1 + 2 * f, lo = Math.max(0, -cc), hi = Math.min(1, 1 - cc); bk.push(...at(lo + (hi - lo) * s0, lo + (hi - lo) * s0 + cc), ...at(lo + (hi - lo) * s1, lo + (hi - lo) * s1 + cc)); }
    }
  };
  const strokeL = (L, mul) => {
    const base = [0.75, 0.85, 0.95];
    L.b.forEach((a, i) => { const ty = i >> 2, l = i & 3; if (!a.length) return; g.pen(c, 'hair', base[ty] * FL[l] * mul * ga, ink); c.beginPath(); for (let k = 0; k < a.length; k += 4) { c.moveTo(a[k], a[k + 1]); c.lineTo(a[k + 2], a[k + 3]); } c.stroke(); });
    if (flat > 0.01) L.p.forEach((ps, ty) => { if (!ps.length) return; c.globalAlpha = [0.07, 0.16, 0.28][ty] * flat * mul * ga; c.fillStyle = ink; c.beginPath(); ps.forEach(P => { c.moveTo(...P[0]); for (let k = 1; k < 4; k++) c.lineTo(...P[k]); c.closePath(); }); c.fill(); });
    g.pen(c, 'fine', 0.9 * fe * mul * ga, ink); c.beginPath(); L.em.forEach(e => { c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]); }); c.stroke();
  };
  const hh = (i, j) => (i >= M || j >= M ? 0 : Hs[i * M + j]), S = mkL();
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) { const h = hh(i, j); if (h) face(S, 0, i, j, h, 0); for (let k = hh(i + 1, j); k < h; k++) face(S, 1, i + 1, j, k, 0); for (let k = hh(i, j + 1); k < h; k++) face(S, 2, i, j + 1, k, 0); }
  const paint = mul => { if (g.params.construction) { g.pen(c, 'hair', 0.5 * mul * ga, g.c.tint1); c.beginPath(); c.arc(0, 0, 0.45 * Math.min(g.bx, g.by) * 2, 0, TAU); for (const d of [ex, ey, ez]) { c.moveTo(-d[0] * 30, -d[1] * 30); c.lineTo(d[0] * 30, d[1] * 30); } c.stroke(); } strokeL(S, mul); };
  // cubes in flight: whole cubes, eased down from above, in front of everything; the heap is drawn through a hole where one flies
  const HX = [[0, -1], [C30, -0.5], [C30, 0.5], [0, 1], [-C30, 0.5], [-C30, -0.5]];
  fl.forEach(f => { const e = g.ease.sine(f.q), i = (f.c / M) | 0, j = f.c % M; f.dz = RISE * (1 - e); f.i = i; f.j = j; f.fade = sm(f.q * 3.3); f.ox = ((i - j) * C30 - cx) * u; f.oy = ((i + j) / 2 - f.lvl - f.dz - cy) * u; });
  const hex = f => { HX.forEach((v, k) => k ? c.lineTo(f.ox + v[0] * u, f.oy + v[1] * u) : c.moveTo(f.ox + v[0] * u, f.oy + v[1] * u)); c.closePath(); };
  if (fl.length) { c.save(); c.beginPath(); c.rect(-3, -3, 6, 6); fl.forEach(hex); c.clip('evenodd'); } paint(1); if (fl.length) c.restore();
  fl.forEach((f, k) => {
    c.save(); c.beginPath(); hex(f); c.clip(); paint(1 - f.fade); c.restore();
    c.save(); c.beginPath(); c.rect(-3, -3, 6, 6); fl.slice(k + 1).forEach(hex); c.clip('evenodd');
    const F = mkL(); face(F, 0, f.i, f.j, f.lvl + 1, f.dz); face(F, 1, f.i + 1, f.j, f.lvl, f.dz); face(F, 2, f.i, f.j + 1, f.lvl, f.dz); strokeL(F, f.fade); c.restore();
  });
  c.globalAlpha = 1;
}

function draw(ctx, { g }) {
  const T = g.T, live = g.live, sm = g.ease.smoother;
  if (!live) { // loop: the heap grows for T - TC seconds, then the last frame dissolves into the first (frame(T) = frame(0))
    const tau = g.p * T, K = Math.floor((T - TC - OFF - DUR) / STEP), tb = table(g, 0, K), a = tau > T - TC ? sm((tau - (T - TC)) / TC) : 0;
    pile(g, ctx, tb, Math.min(tau, T - TC), 1 - a, false); if (a > 0) pile(g, ctx, tb, 0, a, false); return;
  }
  // live: epoch k lasts L moves, then the next heap (a fresh seed at the large scale of a beginner's heap) dissolves in under a long seam; the old one dissolves out
  const L = KMAX - SEAM, per = L * STEP, t = g.drift, k = Math.floor(t / per), a = k ? sm((t - k * per) / (SEAM * STEP)) : 1;
  if (a < 1) pile(g, ctx, table(g, k - 1, KMAX), t - (k - 1) * per, 1 - a, true);
  pile(g, ctx, table(g, k, KMAX), t - k * per, a, true);
}

const mountPiece = (el, o) => mount(el, { piece: { meta, draw }, ...o });
(window.genart ||= {}).mount ??= mountPiece;
export { meta,draw,render,theme,exportPNG,exportWebm,exportFrames, mountPiece as mount };
