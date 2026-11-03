// F09 Glyph tiling (Truchet arcs that straighten into diamonds; after Vera Molnar's tile variations).
// One rule: a slowly sliding sheet of Truchet tiles whose orientation comes from different rules in different regions (parity, a product table, noise), tiles curve or straighten as a wandering mark passes, and slow fronts half-turn the chosen tiles.
export const meta = {
  id: 'f09-glyph-tiling', title: 'Glyph tiling', T: 12, still: 0.3, start: 0.27, aspects: ['4:5', '16:9', '1:1'],
  label: 'A sheet of square tiles each holding quarter-curve ribbons of hairlines that meet across the edges, sliding slowly; different rules set the tile directions in different regions, the curves straighten into diamonds around a wandering point, and slow fronts half-turn some tiles.',
  // tile: tile side (S); flip: share of tiles a front half-turns per loop; scale: noise frequency of the rules; angle: direction of the fronts (rad);
  // turn: length of one half-turn in loop phase; travel: how far the sheet slides per loop (S); mark: radius of the straightening around the wandering mark (S)
  params: { tile: 0.052, flip: 0.15, scale: 3.2, angle: 0.55, turn: 0.28, travel: 0.6, mark: 0.14 },
};
const Q = Math.PI / 2;
const pace = p => p + (0.15 * Math.sin(2 * Math.PI * p)) / (2 * Math.PI); // loop phase whose tempo swells (0.85x to 1.15x) but never stops; exact at 0 and 1
const voice = (g, k) => (g.voice ? g.voice(k) : g.theta * k); // independent phase k: detuned in live mode, integer harmonic in loop mode
let MEMO = { key: '' }; // static noise fields per (seed, size); drift only mixes them, so no noise call runs per frame

export function draw(ctx, { g }) {
  const P = g.params, pitch = P.tile, h = pitch / 2, cols = Math.floor((2 * g.bx) / pitch), rows = Math.floor((2 * g.by) / pitch);
  const K = Math.round(P.travel / pitch), sh = K * pace(g.p) + 0.12 * Math.sin(voice(g, 3)), x0 = -((cols - 1) * pitch) / 2, y0 = -((rows - 1) * pitch) / 2;
  const ang = P.angle + 0.5 * Math.sin(voice(g, 2)), kf = 1 + 0.35 * Math.sin(voice(g, 3) + 1), ca = Math.cos(ang), sa = Math.sin(ang), umax = K * Math.abs(ca) + rows * Math.abs(sa);
  const SPARSE = g.q < 0.6 ? [-0.4, 0.4] : [-0.5, 0, 0.5], DENSE = [-0.5, -0.25, 0, 0.25, 0.5]; // ring offsets in half-tiles; symmetric so neighbours meet; dense holds sparse
  const key = [g.seed, K, rows, P.scale].join('|');
  if (MEMO.key !== key) { // fields indexed [j * K + i % K]; periodic in the column, so the sheet closes after a slide of K tiles
    const F = { key, o: [], m: [], a1: [], a2: [], b1: [], b2: [] }, R = 2 * Math.PI / K, rad = K * pitch * P.scale / (2 * Math.PI);
    for (let j = 0; j < rows; j++) for (let i = 0; i < K; i++) {
      const nx = Math.cos(i * R) * rad, ny = Math.sin(i * R) * rad, y = j * pitch * P.scale, k = j * K + i;
      F.o[k] = g.noise4(nx, ny, y, 1.7); F.m[k] = g.noise4(nx * 0.8 + 9, ny * 0.8, y * 0.8, 2);
      F.a1[k] = g.noise4(nx * 0.4 + 4, ny * 0.4, y * 0.4, 6); F.b1[k] = g.noise4(nx * 0.4 + 4, ny * 0.4, y * 0.4, 16);
      F.a2[k] = g.noise4(nx * 0.3 + 1, ny * 0.3, y * 0.3, 21); F.b2[k] = g.noise4(nx * 0.3 + 1, ny * 0.3, y * 0.3, 31);
    }
    MEMO = F;
  }
  const F = MEMO, dph = 0.025 * (g.drift || 0), cd = Math.cos(dph), sd = Math.sin(dph), thr = 0.5 - P.flip * 1.5;
  // the wandering mark sweeps the sheet once per loop and wanders vertically; tiles near it straighten into diamonds
  const RM = P.mark, wx = -g.bx + 2 * g.bx * ((g.p + 0.15) % 1), wy = g.by * 0.55 * Math.sin(0.1 * (g.drift || 0) + 0.4) + 0.05 * Math.sin(voice(g, 3) + 2);
  const ink = new Path2D(), bold = new Path2D();
  const glyph = (path, x, y, phi, k, kap) => { // two quarter-curves, rotated by phi about the tile centre; kap 1 = round arc, 0 = straight chord
    const c = Math.cos(phi), s = Math.sin(phi), kh = k * h, cx = (kh - h) / 2 + ((kh) - (kh - h) / 2) * kap;
    [1, -1].forEach(sg => {
      const T = (a, b) => [x + sg * (a * c - b * s), y + sg * (a * s + b * c)];
      path.moveTo(...T(kh, -h)); path.quadraticCurveTo(...T(cx, cx), ...T(-h, kh));
    });
  };
  ctx.save(); ctx.beginPath(); ctx.rect(-g.bx, -g.by, 2 * g.bx, 2 * g.by); ctx.clip();
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols + K + 1; i++) {
    const m = i % K, k = j * K + m, x = x0 + (i - sh) * pitch, y = y0 + j * pitch;
    const reg = F.a1[k] * cd + F.b1[k] * sd, rule = F.a2[k] * cd + F.b2[k] * sd; // regions and which rule applies there, both drifting
    // orientation rules: parity of column xor row, a product table, or noise threshold
    const o0 = rule < -0.22 ? (m ^ j) & 1 : rule > 0.28 ? ((m * (j + 1)) % 3 === 0 ? 1 : 0) : F.o[k] > 0 ? 1 : 0;
    const mv = F.m[k] > thr ? 1 : 0, u = (m * ca + j * sa) / umax;
    let n = 0; if (mv) { const z = g.p - 0.5 * kf * u, f = z - Math.floor(z); n = Math.floor(z) + g.ease.smoother(f / P.turn); } // one half-turn per loop, started along the front
    const phi = (o0 + 2 * n) * Q;
    const dm = Math.hypot(x - wx, y - wy) / RM, kap = Math.min(1, Math.max(0, 0.5 + 1.2 * reg)) * g.ease.smoother(Math.min(1, dm)); // curvature: set by region, straight near the mark
    (reg > 0.3 ? DENSE : SPARSE).forEach(r => { glyph(reg < -0.4 && r === 0 ? bold : ink, x, y, phi, r, kap); });
  }
  g.pen(ctx, 'fine', 0.9, g.c.ink); ctx.stroke(ink);
  g.pen(ctx, 'line', 0.7, g.c.ink); ctx.stroke(bold);
  ctx.restore();
}
