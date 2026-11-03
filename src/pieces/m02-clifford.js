// M02 Clifford attractor (a plane map iterated, drawn as dust).
// One rule: the map x' = sin(a y) + c cos(a x), y' = sin(b x) + d cos(b y) folds a lattice of points onto a thin filigree, and density alone gives the tone.
export const meta = {
  id: 'm02-clifford', title: 'Clifford attractor', T: 12, still: 0.1, start: 0.25, dprMax: 1, aspects: ['4:5', '16:9', '1:1'],
  math: "x' = sin(a y) + c cos(a x),  y' = sin(b x) + d cos(b y);  (a, b) walk a small circle",
  label: 'A fixed lattice of points pushed through the Clifford map eight times lands on a folded filigree; the parameters walk a small circle so the cloud unfolds and refolds, with a second, smaller attractor in the cool colour.',
  // seeds: lattice points per big attractor; eps: radius of the parameter circle; dwell: seconds before the live piece moves on to another attractor
  params: { seeds: 8000, eps: 0.07, dwell: 50 },
};

// attractors known to stay rich in a neighbourhood of (a, b): a, b, c, d
const FAM = [[-1.4, 1.6, 1.0, 0.7], [1.7, 1.7, 0.6, 1.2], [1.5, -1.8, 1.6, 0.9], [-1.7, 1.8, -1.9, -0.4], [-1.8, -2.0, -0.5, -0.9], [1.7, 1.3, -0.1, -1.21]];
const TAU = Math.PI * 2, K = 8, KEEP = 5; // iterations per lattice point; the last KEEP iterates are drawn
const SC = { w: 0, h: 0, cv: null, ctx: null, img: null, u32: null, cA: null, cB: null, hit: null, nh: 0, sx: null, sy: null, box: {} };
const ALPHA = [0.4, 0.55]; // alpha of one hit: big attractor, small attractor
const TB = new Float64Array(4097), INV = 4096 / TAU; for (let i = 0; i <= 4096; i++) TB[i] = Math.sin(i / INV);
const sn = v => { const u = (v + 25.2) * INV, i = u | 0, f = u - i; return TB[i & 4095] * (1 - f) + TB[(i & 4095) + 1] * f; }; // sine from a table, |v| < 25, error 3e-7
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function lattice(N) { // R2 low-discrepancy sequence on [-1, 1]^2, built once
  if (SC.sx && SC.sx.length >= N) return;
  SC.sx = new Float32Array(N); SC.sy = new Float32Array(N);
  for (let i = 0; i < N; i++) { SC.sx[i] = ((i + 0.5) * 0.7548776662466927 % 1) * 2 - 1; SC.sy[i] = ((i + 0.5) * 0.5698402909980532 % 1) * 2 - 1; }
}
// where the iterates of an attractor fall: centre and half-size, measured once per family member and kept fixed so the picture never pulses
function box(k) {
  if (SC.box[k]) return SC.box[k];
  const [a, b, c, d] = FAM[k], B = 1 + Math.max(Math.abs(c), Math.abs(d)); let x0 = 9, x1 = -9, y0 = 9, y1 = -9; const xs = [], ys = [];
  for (let i = 0; i < 4000; i++) {
    let x = SC.sx[i] * B, y = SC.sy[i] * B;
    for (let j = 0; j < K; j++) { const nx = Math.sin(a * y) + c * Math.cos(a * x); y = Math.sin(b * x) + d * Math.cos(b * y); x = nx; }
    xs.push(x); ys.push(y);
  }
  xs.sort((p, q) => p - q); ys.sort((p, q) => p - q);
  x0 = xs[40]; x1 = xs[3959]; y0 = ys[40]; y1 = ys[3959];
  return (SC.box[k] = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hx: (x1 - x0) / 2 * 1.04, hy: (y1 - y0) / 2 * 1.04 });
}

export function draw(ctx, { g }) {
  const P = g.params, q = Math.min(1, g.q ?? 1), w = g.w, h = g.h, S = g.S, N = Math.round(P.seeds * q), live = g.live;
  lattice(P.seeds);
  const sm = g.ease.smoother;
  // layers: which family member, where, how big, how much of its lattice shows (live: a slow hand-over to another attractor)
  const pick = (r, k) => { r = g.rng('pick' + k); return Math.floor(r() * FAM.length); };
  const layers = [], aw = g.bx, ah = g.by * 0.85, small = 0.46;
  const addLayer = (kind, member, amount) => { if (amount > 0.004) layers.push({ kind, member, amount }); };
  if (live) {
    for (const kind of [0, 1]) {
      const s = g.drift / P.dwell + kind * 0.43, k = Math.floor(s), f = s - k, wgt = sm((f - 0.75) / 0.25);
      let m0 = pick(0, kind * 100 + k), m1 = pick(0, kind * 100 + k + 1); if (m1 === m0) m1 = (m1 + 1) % FAM.length;
      addLayer(kind, m0, 1 - wgt); addLayer(kind, m1, wgt);
    }
  } else { addLayer(0, pick(0, 0), 1); addLayer(1, (pick(0, 0) + 2 + (pick(0, 1) % 3)) % FAM.length, 1); }
  const pts = typeof document === 'undefined'; // headless motion test: no canvas, report a sample of dots instead
  if (!pts && (SC.w !== w || SC.h !== h)) {
    SC.w = w; SC.h = h; SC.cv = document.createElement('canvas'); SC.cv.width = w; SC.cv.height = h; SC.ctx = SC.cv.getContext('2d');
    SC.img = SC.ctx.createImageData(w, h); SC.u32 = new Uint32Array(SC.img.data.buffer); SC.cA = new Uint8Array(w * h); SC.cB = new Uint8Array(w * h); SC.hit = new Int32Array(w * h);
  }
  const { cA, cB, hit, u32 } = SC, k = Math.max(1, Math.round(S / 900)); let nh = 0, minx = w, miny = h, maxx = 0, maxy = 0;
  const e = P.eps;
  for (const L of layers) {
    const [a0, b0, c, d] = FAM[L.member], bx = box(L.member), kind = L.kind;
    // the parameter point walks a small circle (loop: one turn per loop; live: two voices that slip against each other)
    const ph = kind ? g.voice(2) + 1.7 : g.voice(1), pb = kind ? g.voice(1) + 4 : g.voice(2) + 0.6;
    const a = a0 + e * Math.cos(ph) * (kind ? 0.8 : 1), b = b0 + e * Math.sin(ph) * (kind ? 0.8 : 1) + 0.4 * e * Math.sin(pb);
    const Bm = 1 + Math.max(Math.abs(c), Math.abs(d)), s0 = Math.min(aw / bx.hx, ah / bx.hy), s1 = Math.min(aw / bx.hy, ah / bx.hx), rot = s1 > s0, sc = Math.max(s0, s1) * (kind ? small : 1); // turn the attractor a quarter if that fills the page better
    const ox = kind ? 0.35 * g.bx : 0, oy = kind ? 0.42 * g.by : -0.08 * g.by; // the small one sits low and right, half overlapping
    const n = Math.round(N * L.amount * (kind ? 0.45 : 1)), grid = kind ? cB : cA;
    for (let i = 0; i < n; i++) {
      let x = SC.sx[i] * Bm, y = SC.sy[i] * Bm;
      for (let j = 0; j < K; j++) {
        const nx = sn(a * y) + c * sn(a * x + 1.5707963); y = sn(b * x) + d * sn(b * y + 1.5707963); x = nx;
        if (j < K - KEEP) continue;
        const dx = x - bx.cx, dy = y - bx.cy, X = (rot ? -dy : dx) * sc + ox, Y = (rot ? dx : dy) * sc + oy;
        if (pts) { if (i % 50 === 0) ctx.rect(X, Y, 0, 0); continue; }
        const ix = Math.round(w / 2 + X * S - k / 2), iy = Math.round(h / 2 + Y * S - k / 2);
        if (ix < 0 || iy < 0 || ix + k > w || iy + k > h) continue;
        for (let yy = 0; yy < k; yy++) for (let xx = 0; xx < k; xx++) {
          const o = (iy + yy) * w + ix + xx;
          if (!(cA[o] | cB[o])) hit[nh++] = o;
          if (grid[o] < 255) grid[o]++;
        }
        if (ix < minx) minx = ix; if (iy < miny) miny = iy; if (ix + k > maxx) maxx = ix + k; if (iy + k > maxy) maxy = iy + k;
      }
    }
  }
  if (pts || !nh) return;
  // resolve counts to ink: alpha = 1 - (1 - a1)^hits, colour from the share of each attractor, then blit the dirty box
  const ink = hex(g.c.ink), cool = hex(g.c.cool), lutA = new Uint8Array(64), lutB = new Uint8Array(64);
  for (let i = 1; i < 64; i++) { lutA[i] = 255 * (1 - Math.pow(1 - ALPHA[0], i)); lutB[i] = 255 * (1 - Math.pow(1 - ALPHA[1], i)); }
  for (let i = 0; i < nh; i++) {
    const o = hit[i], a = Math.min(63, cA[o]), b = Math.min(63, cB[o]), aa = lutA[a], ab = lutB[b], al = 255 - (255 - aa) * (255 - ab) / 255, t = ab > aa ? 1 : 0;
    u32[o] = (al << 24) | (((ink[2] + (cool[2] - ink[2]) * t) | 0) << 16) | (((ink[1] + (cool[1] - ink[1]) * t) | 0) << 8) | ((ink[0] + (cool[0] - ink[0]) * t) | 0);
  }
  const dw = maxx - minx, dh = maxy - miny;
  SC.ctx.putImageData(SC.img, 0, 0, minx, miny, dw, dh);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(SC.cv, minx, miny, dw, dh, minx, miny, dw, dh); ctx.restore();
  for (let i = 0; i < nh; i++) { const o = hit[i]; cA[o] = cB[o] = 0; u32[o] = 0; }
}
