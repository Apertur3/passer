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

// V02 Knoop (an interlaced torus knot, turning in space, with true over and under).
// One rule: a torus knot is drawn as a ribbon of three coloured pencil lines, rotated slowly in 3D, and wherever two parts of the ribbon cross, the part nearer to us is unbroken and the part behind it is cut.
const meta = {
  id: 'v02-knoop', pencils: true, title: 'Knoop', nl: 'Knoop', T: 16, still: 0.51, start: 0.01, aspects: ['4:5', '16:9', '1:1'],
  math: 'x = (R + r cos qt) cos pt,  y = (R + r cos qt) sin pt,  z = r sin qt  (torus knot T(p,q); the trefoil is T(2,3))',
  label: 'A torus knot drawn as a ribbon of three pencil lines turns slowly in space and melts from the trefoil into five-crossing and larger knots, with every crossing cut so the nearer strand passes over.',
  // r: tube radius over core radius; spacing: distance between the three lines (S); gap: cut either side of an over strand (S);
  // twist: how much the ribbon turns edge-on in 3D (0 = flat ribbon facing us); seg: samples around the knot at q = 1
  params: { pitch: 0.3, r: 0.5, spacing: 0.0125, gap: 0.0045, twist: 0.3, seg: 520 },
};

const TAU = 2 * Math.PI, KN = [[2, 3], [2, 5], [3, 5], [3, 4]]; // the metamorphosis cycle
const SEG = [0, 0.17, 0.5, 0.67, 1]; // loop fraction at which each knot of KN is reached
const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
// scratch, only grown, never read across frames
const SC = { n: 0, X: null, Y: null, Z: null, mp: null, mu: null, next: null, head: new Int32Array(4096) };

function draw(ctx, { g }) {
  const P = g.params, rr = g.rng('knot'), a0 = rr() * TAU, a1 = rr() * TAU, a2 = rr() * TAU;
  const N = Math.max(320, Math.round(P.seg * Math.min(1, g.q ?? 1))), sp = P.spacing, lwid = g.lw('line') * 1.3;
  if (SC.n < N) { SC.n = N; SC.X = new Float32Array(N * 3); SC.Y = new Float32Array(N * 3); SC.Z = new Float32Array(N); SC.W = new Float32Array(N); SC.next = new Int32Array(N); }
  const { X, Y, Z, W, head, next } = SC;
  // which knot, and how far it has melted into the next one (a short hold, then a smooth blend)
  // (a change of q only slides the tube, a change of p moves the whole knot round the axis, so p changes get twice the time)
  const F0 = g.voice(1) / TAU, F = F0 - Math.floor(F0); let i0 = 0; while (i0 < 3 && F >= SEG[i0 + 1]) i0++;
  const f = (F - SEG[i0]) / (SEG[i0 + 1] - SEG[i0]), b = sm((f - 0.18) / 0.64);
  const A = KN[i0], B = KN[(i0 + 1) % 4], R = 1, r = P.r;
  // rotation: a steady spin about the torus axis (a third of a turn per loop: the trefoil looks the same after that, so the loop closes),
  // plus a pitch that tips the torus toward us and a yaw, each on its own slowly detuned voice
  const spin = g.voice(1) / KN[0][1], pitch = P.pitch + 0.12 * Math.sin(g.voice(2) + a1) + 0.08 * Math.sin(g.drift * 0.11), yaw = 0.14 * Math.sin(g.voice(3) + a2) + 0.06 * Math.sin(g.drift * 0.07 + a0);
  const cs = Math.cos(spin), ss = Math.sin(spin), cp = Math.cos(pitch), sP = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  // M = Ry * Rx * Rz applied to a model vector (x, y, z); rows give screen x, screen y, depth (toward us)
  const m00 = cy * cs + sy * sP * ss, m01 = -cy * ss + sy * sP * cs, m02 = sy * cp;
  const m10 = cp * ss, m11 = cp * cs, m12 = -sP;
  const m20 = -sy * cs + cy * sP * ss, m21 = sy * ss + cy * sP * cs, m22 = cy * cp;
  const sc = Math.min(g.bx, g.by) / (R + r) * 0.97, tw = P.twist;

  // sample the blended knot: position, ribbon direction in the surface (tangent x torus normal), all in model space first
  if (!SC.mp || SC.mp.length < 3 * N) { SC.mp = new Float32Array(3 * N); SC.mu = new Float32Array(3 * N); }
  const mp = SC.mp, mu = SC.mu;
  for (let i = 0; i < N; i++) {
    const s = (i / N) * TAU; let x = 0, y = 0, z = 0, ux = 0, uy = 0, uz = 0, rho = 0;
    for (let e = 0; e < 2; e++) {
      const [p, q] = e ? B : A, wgt = e ? b : 1 - b, c = q * s, a = p * s, ca = Math.cos(a), sa = Math.sin(a), cc = Math.cos(c), sc2 = Math.sin(c);
      x += wgt * ca; y += wgt * sa; rho += wgt * (R + r * cc); z += wgt * r * sc2; ux += wgt * cc * ca; uy += wgt * cc * sa; uz += wgt * sc2;
    }
    const dl = Math.hypot(x, y) || 1, k = rho / Math.sqrt(dl); x *= k; y *= k; // half-way between a plain blend and one that keeps the radius: a strand dips toward the axis but never pops across it
    mp[i * 3] = x; mp[i * 3 + 1] = y; mp[i * 3 + 2] = z; mu[i * 3] = ux; mu[i * 3 + 1] = uy; mu[i * 3 + 2] = uz;
  }
  const o = P.spacing;
  for (let i = 0; i < N; i++) {
    const a = ((i + N - 1) % N) * 3, c = ((i + 1) % N) * 3, k = i * 3;
    const tx = mp[c] - mp[a], ty = mp[c + 1] - mp[a + 1], tz = mp[c + 2] - mp[a + 2];
    // ribbon direction bn = t x u, normalised; rotated into the view
    let bx = ty * mu[k + 2] - tz * mu[k + 1], by = tz * mu[k] - tx * mu[k + 2], bz = tx * mu[k + 1] - ty * mu[k];
    const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;
    const sx = m00 * mp[k] + m01 * mp[k + 1] + m02 * mp[k + 2], sY = m10 * mp[k] + m11 * mp[k + 1] + m12 * mp[k + 2];
    const dx = (m00 * mp[c] + m01 * mp[c + 1] + m02 * mp[c + 2]) - (m00 * mp[a] + m01 * mp[a + 1] + m02 * mp[a + 2]);
    const dy = (m10 * mp[c] + m11 * mp[c + 1] + m12 * mp[c + 2]) - (m10 * mp[a] + m11 * mp[a + 1] + m12 * mp[a + 2]);
    const dl = Math.hypot(dx, dy) || 1e-9, nx = -dy / dl, ny = dx / dl;
    const pbx = m00 * bx + m01 * by + m02 * bz, pby = m10 * bx + m11 * by + m12 * bz; // ribbon direction as seen on screen
    let vx = nx * (1 - tw) + pbx * tw, vy = ny * (1 - tw) + pby * tw; // blend of screen normal and the 3D ribbon direction
    if (vx * nx + vy * ny < 0) { vx = -vx; vy = -vy; } // keep the line order (never swap lines mid-ribbon)
    W[i] = Math.hypot(vx, vy) * o; // half the ribbon width here (it narrows where the ribbon turns edge-on)
    vx *= o; vy *= o;
    const X0 = sx * sc, Y0 = sY * sc; Z[i] = (m20 * mp[k] + m21 * mp[k + 1] + m22 * mp[k + 2]) * sc;
    for (let l = 0; l < 3; l++) { X[l * N + i] = X0 + (l - 1) * vx; Y[l * N + i] = Y0 + (l - 1) * vy; }
  }
  const CX = X.subarray(N, 2 * N), CY = Y.subarray(N, 2 * N); // centre line = middle line of the ribbon
  // the construction: the torus's core circle, faint, in the same view
  g.pen(ctx, 'hair', 1, g.c.tint2); ctx.beginPath();
  for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU, x = Math.cos(a), y = Math.sin(a), px = (m00 * x + m01 * y) * sc, py = (m10 * x + m11 * y) * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  const cols = g.c.accent === g.c.ink ? [g.c.ink, g.c.tint1, g.c.ink] : [g.c.accent, g.c.cool, g.c.third], wj = [1, 0.9, 1.07];
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  if (typeof document === 'undefined') { // headless motion test: whole ribbons only (the cuts change the point count between frames)
    for (let l = 0; l < 3; l++) { ctx.beginPath(); ctx.moveTo(X[l * N], Y[l * N]); for (let i = 1; i < N; i++) ctx.lineTo(X[l * N + i], Y[l * N + i]); ctx.closePath(); ctx.stroke(); }
    return;
  }
  // Over and under. Clearance of a point of the ribbon = its distance to the centre line of any part of the knot that is nearer to us here
  // (not a neighbour along the same curve), minus half a ribbon and the gap. Clearance <= 0 means "behind something": the line is cut there.
  const cut = sp + lwid + P.gap, ox = -0.6, cell = cut, gl = P.gap + lwid, GW = Math.min(63, Math.ceil(1.2 / cell) + 1);
  let len = 0; for (let i = 0; i < N; i++) len += Math.hypot(CX[(i + 1) % N] - CX[i], CY[(i + 1) % N] - CY[i]);
  const win = Math.ceil(3 * cut / (len / N)) + 2; // samples along the same curve that never count as another part of the knot
  head.fill(-1, 0, GW * GW);
  for (let q = 0; q < N; q++) { const gx = Math.floor((CX[q] - ox) / cell), gy = Math.floor((CY[q] - ox) / cell), hh = gy * GW + gx; next[q] = head[hh]; head[hh] = q; }
  const clr = (x, y, z, i) => {
    const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - ox) / cell); let best = 1e9;
    for (let yy = gy - 1; yy <= gy + 1; yy++) for (let xx = gx - 1; xx <= gx + 1; xx++) {
      for (let q = head[yy * GW + xx]; q >= 0; q = next[q]) {
        let dq = q - i; dq = dq < 0 ? -dq : dq; if (dq > N - dq) dq = N - dq;
        if (dq <= win || Z[q] <= z) continue;
        const dx = CX[q] - x, dy = CY[q] - y, d = Math.sqrt(dx * dx + dy * dy) - W[q]; if (d < best) best = d;
      }
    }
    return best - gl;
  };
  ctx.globalAlpha = 0.94;
  for (let l = 0; l < 3; l++) {
    ctx.strokeStyle = cols[l]; ctx.lineWidth = lwid * wj[l]; ctx.beginPath();
    const o = l * N, cl = i => clr(X[o + i], Y[o + i], Z[i], i); let start = -1;
    for (let i = 0; i < N; i++) if (cl(i) <= 0) { start = i; break; }
    if (start < 0) { ctx.moveTo(X[o], Y[o]); for (let i = 1; i < N; i++) ctx.lineTo(X[o + i], Y[o + i]); ctx.closePath(); }
    else {
      let prev = start, cprev = cl(start), vis = false;
      for (let st = 1; st <= N; st++) {
        const i = (start + st) % N, ccur = cl(i);
        if (!vis && ccur > 0) { const t = -cprev / (ccur - cprev); ctx.moveTo(X[o + prev] + t * (X[o + i] - X[o + prev]), Y[o + prev] + t * (Y[o + i] - Y[o + prev])); ctx.lineTo(X[o + i], Y[o + i]); vis = true; }
        else if (vis && ccur > 0) ctx.lineTo(X[o + i], Y[o + i]);
        else if (vis) { const t = cprev / (cprev - ccur); ctx.lineTo(X[o + prev] + t * (X[o + i] - X[o + prev]), Y[o + prev] + t * (Y[o + i] - Y[o + prev])); vis = false; }
        prev = i; cprev = ccur;
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

const mountPiece = (el, o) => mount(el, { piece: { meta, draw }, ...o });
(window.genart ||= {}).mount ??= mountPiece;
export { meta,draw,render,theme,exportPNG,exportWebm,exportFrames, mountPiece as mount };
