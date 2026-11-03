// M09 Roulette rosette (a hypotrochoid stepped through ninety pen offsets).
// One rule: the same rolling-circle curve is drawn ninety times, each copy with the pen a little further from the centre and turned a little further, until the copies weave moire rosettes.
export const meta = {
  id: 'm09-roulette', title: 'Roulette rosette', T: 16, still: 0.5, start: 0.3, aspects: ['4:5', '16:9', '1:1'],
  math: 'x = (R-r) cos u + d cos(((R-r)/r) u), y = (R-r) sin u - d sin(((R-r)/r) u), R/r = a/b rational; d stepped per copy',
  label: 'A hypotrochoid drawn ninety times, each copy with the pen offset a little larger and the copy turned a little further, so the copies weave moire rosettes.',
  // copies: curves per rosette; pts: samples per curve at q = 1; reach: largest pen offset d relative to R-r
  params: { copies: 90, pts: 240, reach: 0.62 },
};

const TAU = 2 * Math.PI, J = 3, SCR = { n: 0, c: null, s: null };
const sm = u => u * u * (3 - 2 * u);

// One rosette with copies copies. Closed by construction: u = b s, so every term is an integer harmonic of s.
function rosette(ctx, g, r, cx, cy, Rad, copies, vs) {
  const P = g.params, b = 2 + ((r() * 3) | 0), a0 = 5 + ((r() * 3) | 0), M = Math.max(120, Math.round(P.pts * Math.min(1, g.q ?? 1)));
  const nn = [0, 1, 2].map(j => a0 + j - b); // a/b = R/r; the second term has frequency a - b = (R-r)/r times b
  if (SCR.n < M + 1) { SCR.n = M + 1; SCR.c = new Float32Array((M + 1) * 4); SCR.s = new Float32Array((M + 1) * 4); }
  const { c, s } = SCR;
  for (let i = 0; i <= M; i++) { const u = TAU * i / M; c[i * 4] = Math.cos(b * u); s[i * 4] = Math.sin(b * u); for (let j = 0; j < J; j++) { c[i * 4 + 1 + j] = Math.cos(nn[j] * u); s[i * 4 + 1 + j] = Math.sin(nn[j] * u); } }
  // R/r wanders through nearby rationals: the three offset terms trade weight, so the figure morphs from a/b to (a+1)/b to (a+2)/b and on
  const ph = g.voice(1) + g.drift * 0.03, w = [0, 1, 2].map(j => Math.pow(0.5 + 0.5 * Math.cos(ph - TAU * j / J), 2)), ws = w[0] + w[1] + w[2];
  const reach = P.reach * (0.9 + 0.1 * Math.sin(g.voice(3) + g.drift * 0.05)), rot1 = 0.62 * Math.sin(g.voice(1) + vs) + 0.33 * Math.sin(g.voice(2) + 2 + vs), rot2 = 0.55 * Math.sin(g.voice(2) + 1 + vs) + 0.33 * Math.sin(g.voice(3) + vs);
  let ext = 1e-6; // outer extent: the largest copy (d = reach) reaches farthest; normalise so it fills Rad
  for (let m = 0; m <= M; m++) { let x = c[m * 4], y = s[m * 4]; for (let j = 0; j < J; j++) { const k = reach * w[j] / ws; x += k * c[m * 4 + 1 + j]; y -= k * s[m * 4 + 1 + j]; } ext = Math.max(ext, Math.hypot(x, y)); }
  const sc = Rad / ext, G = 6, paths = [];
  for (let k = 0; k < G; k++) paths.push(new Path2D());
  for (let i = 0; i < copies; i++) {
    const f = i / (copies - 1), d = reach * (0.12 + 0.88 * f), al = (i % 2 ? -rot2 : rot1) * (0.35 + 0.65 * f), ca = Math.cos(al), sa = Math.sin(al), P2 = paths[i % G];
    for (let m = 0; m <= M; m++) {
      let x = c[m * 4], y = s[m * 4];
      for (let j = 0; j < J; j++) { const k = d * w[j] / ws; x += k * c[m * 4 + 1 + j]; y -= k * s[m * 4 + 1 + j]; }
      const px = cx + (x * ca - y * sa) * sc, py = cy + (x * sa + y * ca) * sc;
      m ? P2.lineTo(px, py) : P2.moveTo(px, py);
    }
    P2.closePath();
  }
  paths.forEach((p, k) => { g.pen(ctx, 'hair', k % 2 ? 0.4 : 0.55, g.c.ink); ctx.stroke(p); });
}

export function draw(ctx, { g }) {
  rosette(ctx, g, g.rng('a'), 0, 0, Math.min(g.bx, g.by), Math.max(30, Math.round(g.params.copies * Math.min(1, g.q ?? 1))), 0);
}
