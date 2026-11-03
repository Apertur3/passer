// V05 Roos (the shaded rose of form drawing).
// One rule: one rhodonea rose r = cos(k t) is drawn as twelve nested closed copies, each smaller, turned a little further and with slimmer petals, so they fan out like a pencil-shaded lotus; k slides between rational values.
export const meta = {
  id: 'v05-roos', pencils: true, title: 'Roos', nl: 'Roos', T: 16, still: 0.3, start: 0.2, aspects: ['4:5', '16:9', '1:1'],
  math: 'r = cos(k t), t in [0, 4 pi), k = p/q in {5/2, 4}, blended in polar form r = (1-L) r_a + L r_b; copy j: scale 1 - j h, turn j d, petal exponent 1 + j/20',
  label: 'One rose r = cos(kt) drawn as twelve nested pencil copies that fan out like a shaded lotus, while k slides between rational values.',
  // copies: nested copies; size: rose radius in S
  params: { copies: 12, size: 0.42 },
};

const TAU = 2 * Math.PI, M = 900, KS = [2.5, 4], SP = new Float32Array(M * 2);
const sm = u => (u = Math.min(1, Math.max(0, u))) * u * (3 - 2 * u);
const hash = (i, l) => { const v = Math.sin(i * 12.9898 + l * 78.233) * 43758.5453; return v - Math.floor(v); };

export function draw(ctx, { g }) {
  const P = g.params, L = Math.max(4, Math.round(P.copies * Math.min(1, g.q ?? 1))), mono = g.c.cool === g.c.ink;
  const h = 0.064 + 0.016 * Math.sin(g.voice(4)), d = 0.035 + 0.02 * Math.sin(g.voice(3)), phi = 0.3 * Math.sin(g.voice(1));
  const u = g.voice(2) / TAU, k0 = ((Math.floor(u) % 2) + 2) % 2, f = sm((u - Math.floor(u) - 0.08) / 0.84), ka = KS[k0], kb = KS[1 - k0];
  for (let j = 0; j < L; j++) {
    const r0 = P.size * (1 - j * h * 12 / L), e = 1 + 0.9 * j / L, rot = phi + j * d, cr = Math.cos(rot), sr = Math.sin(rot), q = j / (L - 1);
    for (let i = 0; i < M; i++) {
      const t = 2 * TAU * i / M, c = (1 - f) * Math.cos(ka * t) + f * Math.cos(kb * t), rad = r0 * Math.sign(c) * Math.pow(Math.abs(c), e), x = rad * Math.cos(t), y = rad * Math.sin(t);
      SP[i * 2] = cr * x - sr * y; SP[i * 2 + 1] = sr * x + cr * y;
    }
    const col = mono ? (q < 0.5 ? g.c.ink : g.c.tint1) : j === 0 ? g.c.cool : q < 0.5 ? g.c.cool : g.c.third;
    g.pen(ctx, j === 0 ? 'line' : 'fine', (mono ? 0.9 - 0.55 * q : 0.95 - 0.4 * q) * (0.85 + 0.3 * hash(j, 1)), col);
    ctx.beginPath(); ctx.moveTo(SP[0], SP[1]); for (let i = 1; i < M; i++) ctx.lineTo(SP[i * 2], SP[i * 2 + 1]); ctx.closePath(); ctx.stroke();
  }
}
