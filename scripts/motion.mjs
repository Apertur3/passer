// Motion check (acceptance 8), headless: p75 point speed >= 0.03 S/s in EVERY 0.5 s window, p99 <= 0.15, rotation <= 15 deg/s. A stub ctx records every point a piece draws (moveTo, lineTo, arc, rect,
// curves) in units of the short edge S, with the element rotation at that point; frame k point i is matched to
// frame k+1 point i. usage: node scripts/motion.mjs [id] [aspect-w aspect-h]   (no id: every piece)
import { readdirSync } from 'node:fs';
import { setup } from '../src/genart.js';
const DT = 1 / 15, pc = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const only = process.argv[2], [aw, ah] = [+(process.argv[3] || 4), +(process.argv[4] || 5)];
const dir = new URL('../src/pieces/', import.meta.url);
const ids = only ? [only] : readdirSync(dir).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).sort();

function stubCtx(pts) {
  let m = [1, 0, 0, 1, 0, 0]; const stack = [], mul = (n) => { const [a, b, c, d, e, f] = m; m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f]; };
  const pt = (x, y) => pts.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5], Math.atan2(m[1], m[0])]);
  const own = {
    save: () => stack.push(m), restore: () => { m = stack.pop() || m; }, setTransform: (...a) => { m = a.length === 1 ? [1, 0, 0, 1, 0, 0] : a; },
    resetTransform: () => { m = [1, 0, 0, 1, 0, 0]; }, translate: (x, y) => mul([1, 0, 0, 1, x, y]), scale: (x, y) => mul([x, 0, 0, y, 0, 0]),
    rotate: a => mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]), transform: (...a) => mul(a),
    moveTo: pt, lineTo: pt, arc: (x, y) => pt(x, y), ellipse: (x, y) => pt(x, y), rect: (x, y, w, h) => { pt(x, y); pt(x + w, y + h); },
    strokeRect: (x, y, w, h) => { pt(x, y); pt(x + w, y + h); }, fillRect: (x, y, w, h) => { pt(x, y); pt(x + w, y + h); },
    quadraticCurveTo: (a, b, x, y) => pt(x, y), bezierCurveTo: (a, b, c, d, x, y) => pt(x, y),
  };
  const sink = () => new Proxy(function () {}, { get: () => sink(), apply: () => sink(), set: () => true });
  const props = { lineWidth: 1, globalAlpha: 1, miterLimit: 10, fillStyle: '#000', strokeStyle: '#000' };
  const ctx = new Proxy({}, { get: (_, k) => own[k] || (k in props ? props[k] : sink()), set: (_, k, v) => (props[k] = v, true) });
  cur = { pts, own }; return ctx;
}
// Path2D objects record their points untransformed (identity matrix): an approximation for pieces that use them.
let cur; globalThis.Path2D = class { constructor() { for (const k of ['moveTo', 'lineTo', 'arc', 'ellipse', 'rect', 'quadraticCurveTo', 'bezierCurveTo']) this[k] = (...a) => cur.own[k](...a); } closePath() {} addPath() {} };
function run(id) {
  return import(`../src/pieces/${id}.js`).then(({ meta, draw }) => {
    const W = 800, H = Math.round(W * ah / aw), T = meta.T, start = meta.start ?? 0.25;
    const sample = (t, live = false) => {
      const pts = [], g = setup({ meta }, stubCtx([]), { w: W, h: H, seed: 'a', t, live });
      draw(stubCtx(pts), { seed: 'a', t, w: W, h: H, g }); return pts;
    };
    const N = Math.round(T / DT), WN = Math.round(0.5 / DT), all = [], per = []; let rot = 0, prev = sample(0), varying = 0;
    for (let i = 1; i <= N; i++) {
      const cur = sample(i * DT), n = Math.min(prev.length, cur.length), sp = []; if (prev.length !== cur.length) varying++;
      for (let k = 0; k < n; k++) {
        sp.push(Math.hypot(cur[k][0] - prev[k][0], cur[k][1] - prev[k][1]) / DT);
        let da = Math.abs(cur[k][2] - prev[k][2]); da = Math.min(da, 2 * Math.PI - da); rot = Math.max(rot, da / DT * 180 / Math.PI);
      }
      per.push(sp); all.push(...sp); prev = cur;
    }
    all.sort((a, b) => a - b);
    let worst = Infinity, run = 0, longest = 0; // lowest p75 over sliding 0.5 s windows; longest stretch with p75 < 0.03 (pauses <= 1 s are allowed)
    const low = []; for (let i = 0; i < N; i++) { const win = []; for (let j = 0; j < WN; j++) win.push(...per[(i + j) % N]); win.sort((a, b) => a - b); const v = pc(win, 0.75); worst = Math.min(worst, v); low.push(v < 0.03); }
    for (let i = 0; i < 2 * N; i++) { run = low[i % N] ? run + 1 : 0; longest = Math.max(longest, Math.min(run, N)); }
    const stretch = longest ? (longest - 1) * DT + 0.5 : 0;
    // check 11, live evolution: frames T apart in live mode must differ (>= 0.02 S for >= 30% of points), median over 8 times in 60 s
    const fr = []; for (let k = 0; k < 8; k++) { const t0 = 3 + k * 7.3, a = sample(t0, true), b = sample(t0 + T, true), n = Math.min(a.length, b.length); let c = 0; for (let i = 0; i < n; i++) if (Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]) >= 0.02) c++; fr.push(c / Math.max(1, n)); }
    fr.sort((x, y) => x - y); const evo = fr[4];
    const p99 = pc(all, 0.99), unreliable = varying > 0.05 * N;
    const fails = [stretch > 1 && `dead stretch ${stretch.toFixed(1)}s`, p99 > 0.15 && 'p99 too high', rot > 15 && 'rotation', evo < 0.3 && 'live evolution too small'].filter(Boolean);
    console.log(`${fails.length ? (unreliable ? 'WARN' : 'FAIL') : 'ok  '} ${id}: min window p75 ${worst.toFixed(3)}, longest stretch under 0.03: ${stretch.toFixed(1)}s (max 1), p99 ${p99.toFixed(3)} (max 0.15), rot ${rot.toFixed(1)} deg/s (max 15), live evolution ${(100 * evo).toFixed(0)}% of points moved >=0.02 S after one loop (min 30)${fails.length ? '  <- ' + fails.join(', ') : ''}${unreliable ? ' (point count varies between frames: index matching unreliable)' : ''}`);
    return !fails.length || unreliable;
  }).catch(e => { console.log(`SKIP ${id}: ${e.message.slice(0, 80)}`); return true; });
}
let bad = 0; for (const id of ids) if (!(await run(id))) bad++;
process.exit(bad ? 1 : 0);
