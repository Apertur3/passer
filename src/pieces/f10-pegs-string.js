// F10 Pegs and string (times table on a circle, in the manner of string art and Dmitri Cherniak's wrapped strings).
// One rule: every peg i on a ring is joined by a straight string to peg k*i, while the multiplier k slowly sweeps up and back.
export const meta = {
  id: 'f10-pegs-string', title: 'Pegs and string', T: 64, speed: 0.8, start: 0.25, still: 0.12, aspects: ['4:5', '16:9', '1:1'],
  math: 'chord from peg i to peg (k * i) mod N for every peg i; k sweeps continuously from 2 up to 2 + range and back, lingering near whole numbers (cardioid at 2, nephroid at 3, then 3, 4 and 5 cusps)',
  label: 'Pegs on a ring, each joined by a straight thin string to the peg at k times its number, while k sweeps slowly so the glowing envelope curves (cardioid, nephroid and more) bloom and fold into one another.',
  // ring: pegs on the circle; range: how far k travels above 2 (the lowest value of the sweep); linger: how long k lingers near whole numbers (0..0.9);
  // offset: gap between the ink table and the cool table (in k)
  params: { ring: 200, range: 1.0, linger: 0.6, offset: 0.035 },
};

const TAU = Math.PI * 2, PEGS = new Map();

// the ring of pegs is static: painted once per size and theme into an offscreen canvas
function pegLayer(g, R, N) {
  if (typeof document === 'undefined') return null;
  const key = [g.seed, g.w, g.h, g.c.ink, g.c.paper, R, N].join('|');
  if (PEGS.has(key)) return PEGS.get(key);
  const cv = document.createElement('canvas'); cv.width = g.w; cv.height = g.h;
  const c = cv.getContext('2d'); c.setTransform(g.S, 0, 0, g.S, g.w / 2, g.h / 2); c.fillStyle = g.c.ink; c.globalAlpha = 0.9; c.beginPath();
  for (let i = 0; i < N; i++) { const x = R * Math.sin((TAU * i) / N), y = -R * Math.cos((TAU * i) / N); c.moveTo(x + 0.0018, y); c.arc(x, y, 0.0018, 0, 7); }
  c.fill();
  if (PEGS.size > 6) PEGS.delete(PEGS.keys().next().value);
  PEGS.set(key, cv); return cv;
}

export function draw(ctx, { g }) {
  const P = g.params, N = P.ring, R = Math.min(g.bx, g.by), vo = g.voice || (k => k * g.theta);
  const lay = pegLayer(g, R, N);
  if (lay) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lay, 0, 0); ctx.restore(); }
  // the sweep: cosine up and back; its range breathes on another voice (live mode: never the same twice); k lingers near whole numbers
  const u = 0.5 - 0.5 * Math.cos(g.theta), A = P.range * (0.65 + 0.35 * Math.cos(vo(2))) * (1 + 0.7 * (0.5 - 0.5 * Math.cos(vo(3))));
  const x = 1.88 + 0.5 * (0.5 - 0.5 * Math.cos(vo(4) + 1)) + A * u, k = x - (P.linger * Math.sin(TAU * x)) / TAU;
  const px = i => R * Math.sin((TAU * i) / N), py = i => -R * Math.cos((TAU * i) / N);
  // two tables: ink at k, a fainter ink table at k + offset; four alpha groups each so crossings build the glow
  for (let layer = 0; layer < 2; layer++) {
    const kk = k + layer * P.offset;
    for (let b = 0; b < 4; b++) {
      ctx.beginPath();
      for (let i = 1 + b; i < N; i += 4) { const t = kk * i; ctx.moveTo(px(i), py(i)); ctx.lineTo(px(t), py(t)); }
      g.pen(ctx, 'hair', layer ? 0.4 : 0.62, g.c.ink); ctx.stroke();
    }
  }
}
