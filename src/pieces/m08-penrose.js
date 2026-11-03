// M08 Penrose tiling by de Bruijn's pentagrid, with phason drift.
// One rule: five families of parallel lines x.e_j + g_j = integer; every crossing of two lines becomes one rhomb, and sliding the lines (keeping the offsets summing to zero) flips tiles but never breaks the Penrose pattern.
export const meta = {
  id: 'm08-penrose', title: 'Penrose phason drift', T: 16, still: 0.3, start: 0.25, dprMax: 1.5, aspects: ['4:5', '16:9', '1:1'],
  math: 'x.e_j + g_j in Z, e_j = (cos 2pi j/5, sin 2pi j/5), sum g_j = 0; rhomb vertices sum_m K_m e_m, K_m = ceil(x.e_m + g_m); g_j = g0_j + A cos(theta + 4 pi j/5)',
  label: 'A Penrose rhomb tiling generated from a pentagrid whose lines slowly slide, so tiles flip in place while the pattern stays a perfect Penrose tiling.',
  // edge: rhomb edge as a fraction of the short side; a, b: phason amplitudes of the two slides (b is a second, faster harmonic); soft: width of one flip in grid units
  params: { edge: 0.058, a: 0.07, b: 0.025, soft: 0.1 },
};

const E = Array.from({ length: 5 }, (_, j) => [Math.cos(2 * Math.PI * j / 5), Math.sin(2 * Math.PI * j / 5)]);
const CAP = 9000, RH = new Float32Array(CAP * 9); // per rhomb: 8 vertex coords + thick flag (reused, never read across frames)
const HM = 32767, HX = new Int32Array(HM + 1), HY = new Int32Array(HM + 1); // edge table (scratch)
const sm = u => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('m08'), TAU = 2 * Math.PI;
  const g0 = [0, 0, 0, 0, 0].map(() => (r() - 0.5) * 0.7); g0[4] = -(g0[0] + g0[1] + g0[2] + g0[3]);
  const v1 = g.voice(1), v2 = g.voice(2), dr = g.drift; // dr: slow unbounded time (live only)
  // phason: two closed circles in offset space; both keep the sum at zero (the five cosines of a 4pi/5 or 2pi/5 phase ladder cancel)
  const gm = g0.map((v, m) => v + P.a * Math.cos(v1 + 4 * Math.PI * m / 5) + P.b * Math.cos(v2 + 2 * Math.PI * m / 5 + 1)), cx = -gm.reduce((a, v, m) => a + v * E[m][0], 0) / 2.5, cy = -gm.reduce((a, v, m) => a + v * E[m][1], 0) / 2.5; // grid point that sits at the physical centre
  const es = P.edge * (1 + 0.13 * Math.sin(v1 + 1) + 0.06 * Math.sin(dr * 0.07 + 1)), rot = 0.26 * Math.sin(v1 + 2.2) + 0.12 * Math.sin(dr * 0.09), cr = Math.cos(rot), sr = Math.sin(rot), w = P.soft;
  // visible radius in tiling units
  const Rp = Math.hypot(g.hw, g.hh) / es + 2, rho = (Rp + 1) / 2.5, W0 = w / 2;
  let n = 0;
  for (let j = 0; j < 5; j++) for (let k = j + 1; k < 5; k++) {
    // intersection of line a of family j and line b of family k, solved by Cramer's rule
    const ej = E[j], ek = E[k], det = ej[0] * ek[1] - ej[1] * ek[0], thick = (k - j === 1 || k - j === 4) ? 1 : 0, ms = [0, 1, 2, 3, 4].filter(m => m !== j && m !== k);
    const pj = cx * ej[0] + cy * ej[1] + gm[j], pk = cx * ek[0] + cy * ek[1] + gm[k], a0 = Math.ceil(pj - rho), a1 = Math.floor(pj + rho), b0 = Math.ceil(pk - rho), b1 = Math.floor(pk + rho);
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
      const ca = a - gm[j], cb = b - gm[k], x = (ca * ek[1] - cb * ej[1]) / det, y = (ej[0] * cb - ek[0] * ca) / det;
      if ((x - cx) ** 2 + (y - cy) ** 2 > rho * rho) continue;
      let bx = a * ej[0] + b * ek[0], by = a * ej[1] + b * ek[1];
      for (const m of ms) {
        const s = x * E[m][0] + y * E[m][1] + gm[m], q = Math.round(s), d = s - q, K = Math.abs(d) < W0 ? q + sm((d + W0) / w) : Math.ceil(s); // ceil, eased across the flip
        bx += K * E[m][0]; by += K * E[m][1];
      }
      if (n >= CAP) break;
      const o = n++ * 9, V = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (let i = 0; i < 4; i++) { const px = bx + V[i][0] * ej[0] + V[i][1] * ek[0], py = by + V[i][0] * ej[1] + V[i][1] * ek[1]; RH[o + i * 2] = (px * cr - py * sr) * es; RH[o + i * 2 + 1] = (px * sr + py * cr) * es; }
      RH[o + 8] = thick;
    }
  }
  const bxm = g.hw + es, bym = g.hh + es, inside = o => { for (let i = 0; i < 4; i++) if (Math.abs(RH[o + i * 2]) < bxm && Math.abs(RH[o + i * 2 + 1]) < bym) return true; return false; };
  // thick rhombs: two hatch lines parallel to the first edge (cool); thin rhombs: one line along the long diagonal (ink, lighter)
  g.pen(ctx, 'hair', 0.9, g.c.cool); ctx.beginPath();
  for (let i = 0; i < n; i++) { const o = i * 9; if (!RH[o + 8] || !inside(o)) continue;
    for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(RH[o] + f * (RH[o + 6] - RH[o]), RH[o + 1] + f * (RH[o + 7] - RH[o + 1])); ctx.lineTo(RH[o + 2] + f * (RH[o + 4] - RH[o + 2]), RH[o + 3] + f * (RH[o + 5] - RH[o + 3])); } }
  ctx.stroke(); g.pen(ctx, 'hair', 0.8, g.c.ink); ctx.beginPath();
  for (let i = 0; i < n; i++) { const o = i * 9; if (RH[o + 8] || !inside(o)) continue; ctx.moveTo(RH[o + 2], RH[o + 3]); ctx.lineTo(RH[o + 6], RH[o + 7]); }
  ctx.stroke();
  // outlines: every edge is shared by two rhombs, so keep a table of edge midpoints and stroke each edge once (a miss only means a double stroke)
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.beginPath(); HX.fill(0x7fffffff);
  for (let i = 0; i < n; i++) { const o = i * 9; if (!inside(o)) continue;
    for (let k = 0; k < 4; k++) { const ax = RH[o + k * 2], ay = RH[o + k * 2 + 1], k2 = (k + 1) & 3, bx = RH[o + k2 * 2], by = RH[o + k2 * 2 + 1], ix = Math.round((ax + bx) * 5e3), iy = Math.round((ay + by) * 5e3);
      let h = (Math.imul(ix, 73856093) ^ Math.imul(iy, 19349663)) & HM, dup = false;
      while (HX[h] !== 0x7fffffff) { if (HX[h] === ix && HY[h] === iy) { dup = true; break; } h = (h + 1) & HM; }
      if (dup) continue; HX[h] = ix; HY[h] = iy; ctx.moveTo(ax, ay); ctx.lineTo(bx, by); } }
  ctx.stroke();
}
