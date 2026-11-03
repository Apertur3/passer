// F03 Trames moire (after Francois Morellet's superposed grids and concentric circles).
// One rule: two sets of concentric rings with slightly shifted centres overprint inside a disc, and the two centres circle in opposite directions so the interference sweeps around the disc.
export const meta = {
  id: 'f03-trames', title: 'Trames moire', T: 12, still: 0.3, start: 0.27, aspects: ['4:5', '16:9', '1:1'],
  label: 'Two sets of fine concentric rings with slightly shifted centres overprint inside a disc; the interference pattern sweeps across as the two centres circle in opposite directions.',
  // pitch: ring spacing (S); offset: orbit radius of the first centre (S), the second circles the other way at 0.9 of it; skip: chance that a ring of the second set is left out (seeded digit stream); ratio: pitch of set two relative to set one
  params: { pitch: 0.0078, offset: 0.1, skip: 0.1, ratio: 1.0, radius: 0.43 },
};

const pace = p => p + (0.15 * Math.sin(2 * Math.PI * p)) / (2 * Math.PI); // loop phase whose tempo swells (0.85x to 1.15x) but never stops; exact at 0 and 1

const voice = (g, k) => (g.voice ? g.voice(k) : g.theta * k); // independent phase k: detuned in live mode, integer harmonic in loop mode (falls back to the plain harmonic when the engine has no voices)
export function draw(ctx, { g }) {
  const P = g.params, r = g.rng('digits'), th = 2 * Math.PI * pace(g.p) + 0.12 * Math.sin(voice(g, 5));
  const R = Math.min(P.radius, g.bx, g.by), a = P.offset * (1 + 0.5 * Math.sin(voice(g, 3))), ratio = P.ratio * (1 + 0.05 * Math.sin(voice(g, 2) + 1));
  const o = [a * Math.cos(th), a * Math.sin(th)], o2 = [-0.9 * a * Math.cos(th + 1), 0.9 * a * Math.sin(th + 1)];  // the two centres circle in opposite directions
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.clip();
  const kc = Math.round(((g.p * R) / P.pitch)); // the pulse: one ring of the first set, travelling outward once per loop; its neighbours thicken as it passes
  const rings = (cx, cy, pitch, skip, pick) => {
    const p = new Path2D(), far = R + 1.5 * P.offset; // fixed ring count, so the drawing keeps the same point sequence
    for (let k = 1; k * pitch < far + pitch; k++) { const sk = skip && r() < skip; if (sk || !pick(k)) continue; p.moveTo(cx + k * pitch, cy); p.arc(cx, cy, k * pitch, 0, 2 * Math.PI); }
    return p;
  };
  const near = k => Math.abs(k - kc) <= 2 && k !== kc;
  g.pen(ctx, 'fine', 0.8, g.c.ink); ctx.stroke(rings(o[0], o[1], P.pitch, 0, k => !near(k) && k !== kc && k % 10 !== 0));
  g.pen(ctx, 'line', 0.55, g.c.ink); ctx.stroke(rings(o[0], o[1], P.pitch, 0, k => (near(k) || k % 10 === 0) && k !== kc)); // heavier rings: every tenth, and the pulse's neighbours
  g.pen(ctx, 'fine', 0.8, g.c.cool); ctx.stroke(rings(o2[0], o2[1], P.pitch * ratio, P.skip, () => true));
  g.pen(ctx, 'line', 0.85, g.c.ink); ctx.beginPath(); ctx.arc(o[0], o[1], kc * P.pitch, 0, 2 * Math.PI); ctx.stroke();
  ctx.restore();
  g.pen(ctx, 'fine', 1, g.c.ink); ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.stroke();
}
