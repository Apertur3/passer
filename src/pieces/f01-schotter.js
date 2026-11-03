// F01 Schotter drift (after Georg Nees, c. 1968).
// One rule: a grid of squares that is perfectly ordered at the top and loses its order row by row.
export const meta = {
  id: 'f01-schotter', title: 'Schotter drift', T: 30, still: 0.35, aspects: ['4:5', '16:9', '1:1'],
  label: 'A grid of squares, perfectly ordered at the top, tilting and drifting further apart row by row toward the bottom.',
  // rows, cols: grid size (16:9 uses rowsWide and fills the width with columns); decay: exponent of amp = (row/rows)^decay;
  // maxAngle in radians, maxShift in cell pitches at full disorder; sway: extra slow rocking of the lower rows
  params: { rows: 24, cols: 16, rowsWide: 15, decay: 1.5, maxAngle: 0.5, maxShift: 0.5, sway: 0.05, gap: 0.14 },
};

export function draw(ctx, { t, g }) {
  const P = g.params, r = g.rng('cells');
  const wide = g.aspect > 1.5, rows = wide ? P.rowsWide : P.rows, pitch = Math.min((2 * g.by) / (rows + 0.8), wide ? 9 : (2 * g.bx) / (P.cols + 0.8)); // +0.8: room for the drift
  const cols = wide ? Math.floor((2 * g.bx) / pitch - 0.8) : P.cols;
  const side = pitch * (1 - P.gap), x0 = -((cols - 1) * pitch) / 2, y0 = -((rows - 1) * pitch) / 2;
  const breath = 0.3 + 0.7 * g.ease.breath(g.p); // overall disorder, 30%..100%, resting at both ends
  // the one deliberate deviation: a square low in the grid that keeps its order
  const ai = 1 + Math.floor(r() * (cols - 2)), aj = Math.floor(rows * 0.7);
  for (let j = 0; j < rows; j++) {
    const row = Math.pow(j / (rows - 1), P.decay);
    for (let i = 0; i < cols; i++) {
      const rx = r() * 2 - 1, ry = r() * 2 - 1, rr = r() * 2 - 1, al = 0.88 + 0.12 * r(), wj = 1 + 0.2 * (r() - 0.5);
      if (i === ai && j === aj) continue;
      const A = row * breath, sw = P.sway * row * g.loop(i * 0.35, j * 0.35, 0.5, g.thetaR);
      ctx.save();
      ctx.translate(x0 + i * pitch + rx * P.maxShift * pitch * A, y0 + j * pitch + ry * P.maxShift * pitch * A);
      ctx.rotate(rr * P.maxAngle * A + sw);
      g.pen(ctx, 'fine', al, g.c.ink); ctx.lineWidth *= wj;
      ctx.strokeRect(-side / 2, -side / 2, side, side);
      ctx.restore();
    }
  }
  g.pen(ctx, 'line', 1, g.c.accent);
  ctx.strokeRect(x0 + ai * pitch - side / 2, y0 + aj * pitch - side / 2, side, side);
}
