// Motion check (acceptance 8) for one piece, headless: records each square's translate/rotate through a stub ctx.
// usage: node scripts/motion.mjs f01-schotter [aspect-w aspect-h]
import { frame, prng, noise4, loopNoise, ease, theme } from '../src/genart.js';
const id = process.argv[2] || 'f01-schotter', [aw, ah] = [+(process.argv[3] || 4), +(process.argv[4] || 5)];
const { meta, draw } = await import(`../src/pieces/${id}.js`);
const W = 800, H = Math.round(W * ah / aw);
function sample(t) {
  const calls = [], cur = { x: 0, y: 0, a: 0 };
  const ctx = new Proxy({}, { get: (_, k) => k === 'translate' ? (x, y) => { cur.x = x; cur.y = y; } : k === 'rotate' ? a => { cur.a = a; calls.push({ ...cur }); } : () => {}, set: () => true });
  const g = frame(new Proxy({}, { get: () => () => {}, set: () => true }), { w: W, h: H, seed: 'a' });
  g.params = meta.params; g.T = meta.T; g.p = (((t / meta.T) % 1) + 1) % 1; g.theta = 2 * Math.PI * g.p; g.thetaR = 2 * Math.PI * ease.rest(g.p); g.ease = ease; g.loop = (x, y, r, th = g.theta) => loopNoise(x, y, th, r);
  draw(ctx, { seed: 'a', t, w: W, h: H, g }); return { calls, S: g.S };
}
const dt = 1 / 30, N = meta.T / dt; let prev = sample(0), maxRot = 0, maxPt = 0; const tot = [];
for (let i = 1; i <= N; i++) {
  const cur = sample(i * dt); let rot = 0, pt = 0;
  cur.calls.forEach((c, k) => { const q = prev.calls[k]; rot = Math.max(rot, Math.abs(c.a - q.a) / dt * 180 / Math.PI); pt = Math.max(pt, Math.hypot(c.x - q.x, c.y - q.y) / dt); });
  maxRot = Math.max(maxRot, rot); maxPt = Math.max(maxPt, pt); tot.push(rot); prev = cur;
}
const rest = tot.filter(v => v < 0.1 * maxRot).length / tot.length;
console.log(`${id}: max rotation ${maxRot.toFixed(2)} deg/s (limit 6), max point speed ${maxPt.toFixed(4)} S/s (limit 0.05), rest ${(100 * rest).toFixed(0)}% of loop under 10% of peak (need 20%)`);
