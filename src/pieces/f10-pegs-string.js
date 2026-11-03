// F10 Pegs and string (after Dmitri Cherniak's wrapped strings, with the old times-table envelope).
// One rule: one long string runs from peg to peg around a ring of pegs in a peg lattice, each far end sliding a few pegs along the ring in a slow rolling wave.
export const meta = {
  id: 'f10-pegs-string', title: 'Pegs and string', T: 16, start: 0.25, still: 0.3, aspects: ['4:5', '16:9', '1:1'],
  label: 'One long thin string wrapped peg to peg around the border of a lattice of pegs, drawing curved envelopes that slowly ripple as its far ends slide along the ring.',
  // across: lattice pegs across the circle; ring: pegs on the circle; mult: times-table multiplier (peg i is joined to peg mult*i);
  // spread: how far the multiplier travels in a loop; wrap: peg wrap radius (S)
  params: { across: 25, ring: 120, mult: 3, spread: 0.2, wrap: 0.0028 },
};

const TAU = Math.PI * 2, mod = (a, n) => ((a % n) + n) % n, wrapPi = a => mod(a + Math.PI, TAU) - Math.PI;
const PEGS = new Map();

// the peg lattice inside a circle, and the ring of border pegs on that circle (clockwise from the top)
function layout(g) {
  const R = Math.min(g.bx, g.by), N = g.params.ring, pitch = (2 * R) / (g.params.across - 1), ring = [];
  for (let k = 0; k < N; k++) ring.push([R * Math.sin((TAU * k) / N), -R * Math.cos((TAU * k) / N)]);
  return { R, N, pitch, ring };
}

// the static layer (pegs) is painted once per size and theme into an offscreen canvas
function pegLayer(g, L) {
  if (typeof document === 'undefined') return null;
  const key = [g.seed, g.w, g.h, g.c.ink, g.c.paper, L.R, L.N].join('|');
  if (PEGS.has(key)) return PEGS.get(key);
  const cv = document.createElement('canvas'); cv.width = g.w; cv.height = g.h;
  const c = cv.getContext('2d'); c.setTransform(g.S, 0, 0, g.S, g.w / 2, g.h / 2);
  c.fillStyle = g.c.tint1; c.globalAlpha = 1; c.beginPath();
  const m = Math.floor(L.R / L.pitch);
  for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) {
    const x = i * L.pitch, y = j * L.pitch;
    if (Math.hypot(x, y) < L.R - L.pitch * 0.6) { c.moveTo(x + 0.0018, y); c.arc(x, y, 0.0018, 0, 7); }
  }
  c.fill(); c.fillStyle = g.c.ink; c.globalAlpha = 0.9; c.beginPath();
  L.ring.forEach(([x, y]) => { c.moveTo(x + 0.0022, y); c.arc(x, y, 0.0022, 0, 7); });
  c.fill();
  if (PEGS.size > 6) PEGS.delete(PEGS.keys().next().value);
  PEGS.set(key, cv); return cv;
}

// heading of the straight run from circle a (side sa) to circle b (side sb); side +1 turns with increasing angle
const heading = (a, b, sa, sb, rw) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], phi = Math.atan2(dy, dx), d = Math.hypot(dx, dy);
  return sa === sb || d < 2 * rw ? phi : phi + Math.asin(Math.min(1, (2 * sa * rw) / d));
};

export function draw(ctx, { g }) {
  const P = g.params, L = layout(g), ring = L.ring, N = L.N, rw = P.wrap, p = g.p, vo = g.voice || (k => k * g.theta);
  const lay = pegLayer(g, L);
  if (lay) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lay, 0, 0); ctx.restore(); }
  else { ctx.fillStyle = g.c.ink; ctx.beginPath(); ring.forEach(([x, y]) => { ctx.moveTo(x + 0.0022, y); ctx.arc(x, y, 0.0022, 0, 7); }); ctx.fill(); }
  const at = u => [L.R * Math.sin((TAU * u) / N), -L.R * Math.cos((TAU * u) / N)]; // a partner position, in fractional pegs
  // vertices: peg i, then its partner mult*i on the border; the string goes peg i -> partner -> peg i+1 -> partner ...
  // each partner slides a few pegs along the ring; the slide runs as a wave once around the ring per loop
  const spread = P.spread * (0.8 + 0.2 * Math.cos(vo(2))), m0 = P.mult + 0.015 * Math.sin(vo(3)); // spread and multiplier drift on their own voices
  const V = [], B = [];
  for (let i = 1; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos(TAU * (p - (0.9 * i) / N));
    V.push(ring[i], at((m0 + spread * w) * i)); B.push(ring[i], at(m0 * i));
  }
  const n = V.length, side = B.map((c, k) => {
    const a = B[Math.max(0, k - 1)], b = B[Math.min(n - 1, k + 1)];
    return Math.sign((c[0] - a[0]) * (b[1] - c[1]) - (c[1] - a[1]) * (b[0] - c[0])) || 1;
  });
  const hd = [];
  for (let k = 0; k < n - 1; k++) hd.push(heading(V[k], V[k + 1], side[k], side[k + 1], rw));
  const seg = k => { // append run k plus the wrap on the peg it arrives at
    const a = V[k], s = side[k], th0 = hd[k] - s * Math.PI / 2, b = V[k + 1], s1 = side[k + 1], th1 = hd[k] - s1 * Math.PI / 2;
    ctx.moveTo(a[0] + rw * Math.cos(th0), a[1] + rw * Math.sin(th0)); ctx.lineTo(b[0] + rw * Math.cos(th1), b[1] + rw * Math.sin(th1));
    if (k + 1 < n - 1) {
      const turn = wrapPi(hd[k + 1] - hd[k]); let sw = s1 * turn >= -0.6 * Math.PI ? turn : turn + s1 * TAU;
      if (s1 * sw < 0 && s1 * sw > -0.6 * Math.PI) sw = turn;
      ctx.arc(b[0], b[1], rw, th1, th1 + sw, sw < 0);
    }
  };
  // two line systems (the outbound runs in ink, the return runs in the cool colour), four alpha groups each, so crossings build density
  for (let layer = 0; layer < 2; layer++) for (let b = 0; b < 4; b++) {
    ctx.beginPath();
    for (let k = layer; k < n - 1; k += 2) if (((k >> 1) & 3) === b) seg(k);
    g.pen(ctx, 'hair', 0.72, layer ? g.c.cool : g.c.ink); ctx.stroke();
  }
}
