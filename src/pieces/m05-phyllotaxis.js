// M05 Phyllotaxis (Vogel's sunflower).
// One rule: every dot n sits at radius c*sqrt(n) and turns 137.5078 degrees plus a small delta from the one before, and delta never sits still.
export const meta = {
  id: 'm05-phyllotaxis', title: 'Phyllotaxis', T: 12, still: 0.3, start: 0.2, aspects: ['4:5', '16:9', '1:1'],
  math: 'r = c sqrt(n),  phi = n (137.5078 deg + delta),  delta wanders by a few hundredths of a degree',
  label: 'One sunflower of halftone dots whose divergence angle drifts a hair around the golden angle, so the spiral arms sweep, merge and change count, with a faint echo of itself that makes a moire halo.',
  // na: dots in the sunflower
  params: { na: 1300 },
};

const TAU = Math.PI * 2, GA = 137.5078 * Math.PI / 180, DEG = Math.PI / 180; 
const SC = { n: 0, x: null, y: null, s: null };
export function draw(ctx, { g }) {
  const P = g.params, R = 1.2 * Math.min(g.bx, g.by), NA = P.na, ink = g.c.ink, oy = -0.04 * g.by; // the disc may touch the sheet edge
  if (SC.n < NA) { SC.n = NA; SC.x = new Float32Array(NA); SC.y = new Float32Array(NA); SC.s = new Float32Array(NA); }
  const { x: X, y: Y, s: S } = SC;
  // divergence angles: a fast hair (voices) plus, live only, a slow wander of a few tenths of a degree through the Fibonacci neighbourhoods
  const slow = Math.sin(g.drift * 0.021 + 0.7) * 0.2 + Math.sin(g.drift * 0.0133 + 2.1) * 0.12;
  const dA = (0.06 + 0.003 * Math.sin(g.voice(1)) + 0.0015 * Math.sin(g.voice(2) + 1.3) + slow) * DEG;
  const gA = 0.5 + 0.004 * Math.sin(g.voice(3)) + 0.012 * Math.sin(g.drift * 0.03);
  const rotA = 0.5 * Math.sin(g.voice(1) + 0.9), rotE = -0.35 * Math.sin(g.voice(1) - 0.4);
  // dot size field (halftone): a ring wave travelling outward and a three-armed wave
  const ph1 = g.voice(1), ph2 = g.voice(2);
  const d0 = R / Math.sqrt(NA) * 1.77, rho = 0.46 * d0; // neighbour spacing and the largest dot radius
  const cA = R / Math.pow(NA, gA);
  for (let n = 0; n < NA; n++) {
    const r = cA * Math.pow(n, gA), a = n * (GA + dA) + rotA, x = r * Math.cos(a), y = r * Math.sin(a);
    const q = r / R, wave = 0.5 + 0.5 * Math.sin(TAU * 1.6 * q - ph1) * 0.7 + 0.3 * Math.sin(3 * Math.atan2(y, x) - ph2 + 4 * q);
    const s = Math.min(1, Math.max(0.08, 0.2 + 0.8 * wave));
    X[n] = x; Y[n] = y; S[n] = s;
  }
  ctx.fillStyle = ink; ctx.globalAlpha = 0.9; ctx.beginPath(); // one path: every dot has its own radius
  for (let n = 0; n < NA; n++) { const rad = rho * (0.14 + 0.86 * S[n]); ctx.moveTo(X[n] + rad, Y[n] + oy); ctx.arc(X[n], Y[n] + oy, rad, 0, TAU); }
  ctx.fill();
  // moire halo: the same sunflower again at 22% alpha, its divergence a few hundredths of a degree off
  const dE = dA + (0.012 + 0.003 * Math.sin(g.voice(2) + 0.5)) * DEG;
  ctx.globalAlpha = 0.22; ctx.beginPath();
  for (let n = 0; n < NA; n++) {
    const r = cA * Math.pow(n, gA), a = n * (GA + dE) + rotE, rad = rho * (0.14 + 0.86 * S[n]) * 0.9; ctx.moveTo(r * Math.cos(a) + rad, r * Math.sin(a) + oy); ctx.arc(r * Math.cos(a), r * Math.sin(a) + oy, rad, 0, TAU);
  }
  ctx.fill();
}
