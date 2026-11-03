// M05 Phyllotaxis (sunflower seed spiral).
// One rule: dot n sits at radius c sqrt(n) and turns 137.5078 degrees plus a hair delta from the dot before; delta drifts slowly, so the spiral arms sweep, merge and change count.
export const meta = {
  id: 'm05-phyllotaxis', title: 'Phyllotaxis', T: 12, still: 0.3, start: 0.2, aspects: ['4:5', '16:9', '1:1'],
  math: 'r = c sqrt(n),  phi = n (137.5078 deg + delta),  delta wanders by a few hundredths of a degree',
  label: 'A large sunflower of fine halftone dots whose divergence angle drifts slowly around the golden angle, so the spiral arms sweep, merge and change count, with a clear patch of open paper that wanders through the dots.',
  // na: dots in the sunflower; fill: figure radius relative to the half sheet
  params: { na: 2000, fill: 0.82 },
};

const TAU = Math.PI * 2, GA = 137.5077640500378 * Math.PI / 180, SC = { n: 0, x: null, y: null, k: null };
const sm = (a, b, v) => { v = (v - a) / (b - a); v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); };

export function draw(ctx, { g }) {
  const P = g.params, NA = Math.max(900, Math.round(P.na * Math.min(1, g.q ?? 1))), R = P.fill * Math.min(g.hw, g.hh), c = R / Math.sqrt(NA), rho = 0.5 * 1.9 * c;
  if (SC.n < NA) { SC.n = NA; SC.x = new Float32Array(NA); SC.y = new Float32Array(NA); SC.k = new Float32Array(NA); }
  const { x: X, y: Y, k: K } = SC, dr = g.drift;
  // delta (scaled by 3000/NA so the rim speed does not depend on the dot count): a quiet loop term (closes at T) plus, live only, a slow wander of about a tenth of a degree through the Fibonacci neighbourhoods
  const v = g.voice(1), tri = (x) => Math.cos(x) + Math.cos(3 * x) / 9 + Math.cos(5 * x) / 25; // near-triangle wave: the sweep keeps its speed to the turn
  const delta = ((g.live ? 0.15 : 1) * 0.0085 * tri(v) + 0.055 * tri(dr * 0.0157 + 0.8) + 0.016 * tri(dr * 0.0091 + 2)) * 3000 / NA * Math.PI / 180, A = GA + delta;
  // size field (halftone): a few standing waves on the sheet plus a drifting void of open paper
  const p1 = g.voice(1), p2 = g.voice(2), p3 = g.voice(3);
  const hx = R * (0.46 * Math.cos(0.9 + 0.5 * Math.sin(p1 * 0.5 + dr * 0.011))), hy = R * (0.4 * Math.sin(0.9 + 0.5 * Math.sin(p1 * 0.5 + dr * 0.011)) - 0.1);
  for (let n = 1; n < NA; n++) {
    const r = c * Math.sqrt(n), a = n * A, x = r * Math.cos(a), y = r * Math.sin(a), q = r / R;
    const ring = 0.5 + 0.5 * Math.cos(TAU * 2.2 * q - p1 * 0.5 - 1.2 * Math.sin(p2 * 0.5));
    const arm = 0.5 + 0.5 * Math.cos(5 * Math.atan2(y, x) + 3.2 * q - p3 * 0.25);
    const vd = Math.hypot(x - hx, y - hy) / R;
    let s = (0.2 + 0.7 * ring * (0.4 + 0.6 * arm) + 0.2 * (1 - q) * (1 - q)) * (0.25 + 0.75 * sm(0.12, 0.5, vd)); s = s > 1 ? 1 : s;
    s *= 0.9 + 0.1 * Math.sin(n * 0.37);
    X[n] = x; Y[n] = y; K[n] = s;
  }
  const minR = 0.45 / g.S; // hairline floor: never thinner than about one device pixel across
  ctx.fillStyle = g.c.ink; ctx.globalAlpha = 0.9; ctx.beginPath(); // one path, one fill: every dot has its own radius
  for (let n = 1; n < NA; n++) {
    const rad = Math.max(minR, rho * (0.15 + 0.85 * K[n] * K[n]));
    ctx.moveTo(X[n] + rad, Y[n]); ctx.arc(X[n], Y[n], rad, 0, TAU);
  }
  ctx.fill();
}
