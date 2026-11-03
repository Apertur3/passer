// V05 Roos (the shaded rose of form drawing, as plotted hairlines).
// One rule: one rhodonea rose r = cos(k t) is copied about forty times, each copy smaller, turned a little further and with slimmer petals, until the hairlines build a translucent lotus; k slides between rational values.
export const meta = {
  id: 'v05-roos', title: 'Roos', nl: 'Roos', T: 16, still: 0.3, start: 0.2, aspects: ['4:5', '16:9', '1:1'],
  math: 'r = cos(k t), t in [0, 4 pi), k = p/q in {5/2, 4}, blended in polar form r = (1-L) r_a + L r_b; copy j: scale 1 - 0.92 j/N, turn j d, petal exponent 1 + 0.9 j/N',
  label: 'One rose r = cos(kt) copied about forty times, each copy smaller, turned a little further and with slimmer petals, so the hairlines build a translucent lotus while k slides between rational values.',
  // copies: nested copies at q = 1; pts: samples per copy
  params: { copies: 44, pts: 360 },
};

const TAU = 2 * Math.PI, KS = [2.5, 4], B = 4;
const sm = u => (u = Math.min(1, Math.max(0, u))) * u * (3 - 2 * u);
const hash = (i, l) => { const v = Math.sin(i * 12.9898 + l * 78.233) * 43758.5453; return v - Math.floor(v); };

export function draw(ctx, { g }) {
  const P = g.params, L = Math.max(20, Math.round(P.copies * Math.min(1, g.q ?? 1))), M = Math.max(240, Math.min(2400, Math.round(P.pts * Math.min(1, Math.max(0.5, g.S / 1000))))), R = 1.08 * Math.min(g.bx, g.by);
  const d = (0.22 + 0.1 * Math.sin(g.voice(3))) / L * 3, br = 0.9 + 0.08 * Math.sin(g.voice(4));
  const u = g.voice(2) / TAU, k0 = ((Math.floor(u) % 2) + 2) % 2, f = sm((u - Math.floor(u) - 0.08) / 0.84), ka = KS[k0], kb = KS[1 - k0];
  for (let b = 0; b < B; b++) {
    g.pen(ctx, b === B - 1 ? 'fine' : 'hair', 0.08 + 0.12 * b, g.c.ink); ctx.beginPath();
    for (let j = 0; j < L; j++) {
      const q = j / (L - 1), lvl = Math.min(B - 1, Math.floor((1 - q) * (0.75 + 0.5 * hash(j, 1)) * B)); if (lvl !== b) continue;
      const r0 = R * (1 - br * q), e = 1 + 0.9 * q, rot = 0.3 * Math.sin(g.voice(1)) + j * d, cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < M; i++) {
        const t = 2 * TAU * i / M, c = (1 - f) * Math.cos(ka * t) + f * Math.cos(kb * t), rad = r0 * Math.sign(c) * Math.pow(Math.abs(c), e), x = rad * Math.cos(t), y = rad * Math.sin(t), X = cr * x - sr * y, Y = sr * x + cr * y;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.closePath();
    }
    ctx.stroke();
  }
}
