# Style spec: plotter-tradition generative pieces

One piece = one deterministic function. The same function renders a poster PNG, a hero
background, a seamless loop video, an avatar, or a live embed in an article column.
Monochrome: grey paper, near-black ink. The look is pen-plotter and early computer art
(1960s to 1980s) printed on real paper, not a screen effect.

## 1. Taste principles

0. **The owner's eye outranks every number in this spec.** Gates (speed band, rests, coverage,
   loop closure) are guides that keep pieces alive and honest; when a gate fights the beauty of a
   piece, keep the beauty and say so in the report. Mathematical wonder (a pure object drawn
   clearly, moving the way the mathematics moves) beats decoration and beats rule-compliance.
1. **One rule, stated plainly.** Every piece can be described in one sentence ("a grid of
   squares that loses its order row by row"). If it cannot, cut until it can.
2. **Order versus disorder is the drama.** Randomness is seasoning on a system, never the system.
3. **Texture completes the image.** Paper grain, ink density, and line overlap do the work
   that colour does elsewhere. A grain-free render is unfinished.
4. **Line and dot are the only marks.** Tone comes from density (hatching, halftone, line
   count), not from gradient fills.
5. **Always moving, never repeating.** Motion rarely stops (a pause of at most 1 s is fine)
   and tempo breathes between a slow swell and a quick gesture. Live, the piece keeps evolving
   and never visibly repeats; the exact loop exists for exports. A piece that holds still reads
   as broken, not calm.
6. **Hairlines in quantity.** Thousands of thin lines beat a few thick ones. Bold marks are rare and deliberate.
7. **Empty paper is part of the composition.** Generous margins. Not every square needs ink.
8. **Variety, not wallpaper.** Every piece shows regions that behave differently at the same
   moment (order beside chaos, calm beside busy), elements at more than one scale or weight, and
   a focal event that moves. A uniform field of identical cells doing the same thing is boring
   however well it is drawn; if a piece can be described as "a grid that wobbles", redesign it.
9. **Banned look:** soft gradient blobs, glow, bloom, chromatic aberration, neon or purple
   gradients, glassy 3D, drop shadows on UI, rounded "card" frames, particle confetti, and
   any coloured accent strip on a left edge.

## 2. Artist to mechanism

| Artist | Steal this | Mechanism |
|---|---|---|
| Georg Nees | Ordered grid decays into disorder (Schotter, c. 1968) | Grid cell i,j: rotation and offset scale with row j, `amp = (j/rows)^1.5` |
| Vera Molnar | Systematic disruption of a grid (Interruptions; (Des)Ordres) | Grid of short lines or concentric squares; per-element chance of removal, jitter, or rotation; the chance follows a stated rule |
| François Morellet | Strict rule plus chance with the rule written down; superposed line grids (Trames) | Parallel line grids rotated by small angles create moiré; a seeded digit stream (Morellet used telephone-book digits once) chooses which cells get ink |
| Manfred Mohr | Cube and hypercube edges projected to 2D | 4D rotation of the 32 tesseract edges, perspective projection, draw a seeded subset of edges |
| Frieder Nake | Probabilistic line compositions (Hommage à Paul Klee, 1965) | Horizontal bands; inside each band, verticals and diagonals placed by probability tables |
| Charles Csuri | Line morph and transformation of a drawing (Hummingbird, 1967; Sine Curve Man, 1967) | Interpolate point lists of drawing A into drawing B; or displace a drawing's points with a sine field |
| Ruth Leavitt | Stretch, rotate, deform one source drawing into a series of variations (1970s serigraph series) | Apply a seeded affine plus nonlinear warp to a base line figure; show 4 to 9 variations. Uncertain: her exact algorithm is not documented in sources checked; treat this as "in the spirit of" |
| Casey Reas | Process: simple agents, emergent drawing (Process Compendium) | Circles move; draw a hairline between centres of each intersecting pair; accumulate |
| Dmitri Cherniak | Strings wrapped around pegs (Ringers) | Peg set on a grid; a string path visits pegs in seeded order; draw hull-wrapped tangent segments |
| Sougwen Chung | Human and machine drawing together; gestural imperfection | Strokes as noisy polylines with pressure (width) and speed (alpha) profiles; hand-like overshoot at ends |
| M. C. Escher | Metamorphosis, recursion, impossible figures | See section 3 |

## 3. Escher, made feasible in 2D

**E1 Metamorphosis tiling.** Square translation tile; its edges are curves `e(s)` with
`e(s)` used on one side and the same curve translated on the opposite side, so tiles always
interlock. Motif A and motif B are two edge-curve sets. A morph field `m(x) ∈ [0,1]` chooses
the blend: `m = smootherstep(0.5 - 0.5*cos(2π(k*x/W - p)))`, evaluated at each edge's own
position so two neighbouring tiles share the exact same curve and never gap. Draw tile outlines plus
interior hatch. **Loop:** scroll the morph phase by exactly one field period per loop
(`p = t/T`), so frame(T) = frame(0) by construction.

**E2 Droste zoom.** A scene that contains itself at scale `s` (e.g. 0.38) at a fixed anchor.
Draw the scene at scales `s^k` for k = -1..6 (stop below 1 px). Animate zoom
`z = s^(-p)`. **Loop:** at p = 1 the zoom equals one recursion step, so the image is identical.
Optional log-polar twist (Print Gallery style): map through `exp((log r + i φ) * (1 + i*log s/2π))`; flag as L.

**E3 Endless stair.** Penrose-stair figure drawn in isometric lines with three-tone hatching
(top, left, right faces). Small figures (ellipses or ticks) climb one step per `T/n`.
**Loop:** after n steps every figure stands where the next one stood, so the loop is the
step period, not the full circuit.

## 4. Family catalogue

Params beyond those listed: `seed`, `density`. Motion speeds obey section 6.

| # | Family | Algorithm | Key params | Motion | Size |
|---|---|---|---|---|---|
| F01 ★ | Schotter drift | Grid of squares; rotation/offset grow with row (Nees) | rows, cols, decay exponent, max angle | Disorder amplitude breathes; the top rows stay still, the bottom rows sway | S |
| F02 | Ruled disorder | Molnar Interruptions short-line grid plus Nake band compositions | cell size, removal chance, band count | A slow wave of removal and return sweeps across, staggered by position | S |
| F03 ★ | Trames moiré | 2 to 3 grids of parallel lines or concentric circles, offset centres (Morellet; reference moiré disc) | line pitch, angle delta, centre offset, clip shape | Angle delta oscillates ±0.6°; the moiré flows a lot while the lines barely move | S |
| F04 | Tesseract | 4D rotation of hypercube edges, projected (Mohr) | edge subset mask, rotation planes, perspective | Rotation in two planes at integer turn ratios (1:2) so it closes; speed eased | M |
| F05 ★ | Hairline flow | 3k to 20k short streamlines through a loop-noise vector field, with a void (disc) the field wraps around | particle count, line length, field scale, void radius | Field evolves via loop noise; lines re-traced each frame, so the hair combs itself | M |
| F06 | Ribbon sheaf | 150 to 400 offset copies of a Lissajous or spline curve form a translucent surface (reference ribbons) | frequencies a:b, copies, twist, alpha | Phase slides one copy-step per loop, which reads as a fold travelling along the ribbon | M |
| F07 ★ | Halftone sphere | Lambert-shaded sphere rendered as AM halftone dots; elliptical cast shadow in halftone | dot pitch, light angle, sphere radius, shadow gap | Light orbits slowly; the sphere lifts 1% and the shadow softens in step | M |
| F08 ★ | Iso-bands | Contour bands of a domain-warped loop-noise field (stands in for reaction-diffusion and zebra tiles) | band count, warp strength, field scale, fill or line | Field drifts; bands split and merge. Real Gray-Scott does not loop, so do not use it | M |
| F09 | Glyph tiling | Truchet arcs, X-and-O tiles, or a sheet of geometric glyphs chosen by rule (Molnar, Leavitt-style variation) | tile size, glyph set, rule (parity, noise threshold) | Tiles flip one at a time in a travelling front; each flip eased over 0.6 s | S |
| F10 | Pegs and string | Peg lattice; seeded peg order; string drawn as tangent segments around pegs (Cherniak) | peg count, string count, wrap side bias | String re-routes peg by peg on a loop-length schedule, one segment eased at a time | M |
| F11 | Process hatching | Reas agents drawing lines between intersecting circles, or Chung-style gesture strokes in clusters | agent count, radius, stroke jitter, pressure curve | Agents orbit closed paths; strokes accumulate then fade over one loop | M |
| F12 ★ | Metamorphosis | E1 above; tile outlines plus face hatching, motif A to B across the width (Escher, Csuri morph) | motif pair, tile size, morph period, hatch angle | Morph front travels one period per loop | M (v1 scope), L (full) |

**Contact sheet v1 = the six ★ (F01, F03, F05, F07, F08, F12).** Each one tests a different
shared helper and a different mark type: grid plus disorder (F01), moiré from pure lines
(F03), hairline density and loop noise (F05), halftone tone (F07), banded fields (F08), and
tessellation plus the Escher request (F12). If these six look right, the other six reuse
their parts.

**Left out on purpose:** the chrome torus, blurry blob and ink-blot tiles in the reference.
They need photoreal shading or blur, which pulls toward the banned look and toward WebGL.
Revisit only with a concrete reason.

## 4b. Math series

Pieces whose subject is the mathematics itself: the equation is the composition, and the
caption in the article can state it. Each carries `meta.math`, one plain-text line with the
defining equation, shown in the preview and used as the article caption. All loops close by
construction (integer frequencies, closed parameter orbits, or exact group steps), so the
loop trick is part of the maths, not a patch.

| # | Piece | The mathematics | Drawn as | Loop and motion | Size |
|---|---|---|---|---|---|
| M01 | Harmonograph | `x(t)=Σ A_i sin(f_i t+φ_i) e^(-d_i t)`, same for y; two to four terms, near-integer ratios (e.g. 3:2 plus a small detune) | One pen path of about 6k segments, hairline, ink alpha accumulating where it retraces | `φ_1` advances 2π per loop with integer `f`, so the figure family returns; a fresh path is computed each frame | M |
| M02 | Clifford attractor | `x'=sin(a y)+c cos(a x)`, `y'=sin(b x)+d cos(b y)` | 60k to 100k iterates as device-pixel dots; density gives the tone | `(a,b)` walk a small circle in parameter space: `a=a0+ε cos θ`, `b=b0+ε sin θ`; the cloud folds and unfolds | M |
| M03 | Epicycles | `z(s)=Σ_k c_k e^(i k s)`, about 12 seeded integer `k`, `\|c_k\|` ∝ `1/\|k\|^1.2` | The closed curve in `tint-2`, the chain of rotating circles at hairline, one pen dot | `s = θ` closes by construction; the chain visibly turns | M |
| M04 | Chladni figure | `u = cos θ·(cos nπx cos mπy − cos mπx cos nπy) + sin θ·(same with n',m')` | Marching-squares contours: `u=0` as `line`, `u=±0.15, ±0.3` as hair | `θ = 2πp` closes; nodal lines migrate and reconnect | M |
| M05 | Phyllotaxis | Vogel: `r = c√n`, `φ_n = n·(φ_g + δ(θ))`, `φ_g = 137.5078°`, `δ = 0.35° sin θ` | N≈2500 small circles or dots, size by `r`; fine or halftone | Spiral arms (parastichies) sweep as `δ` oscillates around the golden angle | S |
| M06 | Hyperbolic tiling | Regular `{p,q}` tiling of the Poincaré disc (e.g. `{5,4}`, `{7,3}`); geodesics are circle arcs orthogonal to the boundary | Edges as arcs plus a hatched checkerboard fill (`q` even); the Escher Circle Limit family | Möbius shift `z→(z+a)/(1+ā z)`, `a = 0.45 sin θ·e^(iψ)`, plus rotation by exactly one `2π/p` step per loop | L |
| M07 | Apollonian gasket | Descartes: `k4 = k1+k2+k3 ± 2√(k1k2+k2k3+k3k1)`, recurse to depth 6 or 7 | Circle outlines at hairline, smallest ones as dots | Disc automorphism `z→(z−a)/(1−ā z)` with `a = 0.35 e^(iθ)` keeps all tangencies; the packing swirls | M |
| M08 | Penrose, phason drift | de Bruijn pentagrid: lines `x·e_j + γ_j ∈ ℤ`, `e_j = (cos 2πj/5, sin 2πj/5)`, `Σγ_j = 0` | Rhomb edges plus two-tone hatching | `γ_j = γ0_j + 0.45 cos(θ + 4πj/5)`; the sum stays 0 so it stays Penrose; tiles flip locally | L |
| M09 | Roulette rosette | Hypotrochoid `x=(R−r)cos u + d cos(((R−r)/r)u)`, `y=(R−r)sin u − d sin(((R−r)/r)u)`, `R/r` rational | About 90 copies, `d` stepped or rotated per copy, hairline | `d(θ)` breathes and the set advances one copy step per loop; moiré rosettes | S |

Math pieces follow every other rule (tokens, themes, motion band, grain, engine contract).
Draw the mathematics honestly: no decorative jitter on the curves themselves.

## 5. Tokens

| Token | Hex | Use |
|---|---|---|
| `paper` | `#E4E2DD` | Background, always painted by the piece |
| `ink` | `#1B1A18` | All marks |
| `tint-1` | `#9E9C98` | Ink at 35% on paper: shadow halftone, secondary lines |
| `tint-2` | `#CCCAC5` | Ink at 12% on paper: ghost grids, construction lines |

No other colours in the `mono` theme. Tints are a convenience for solid fills; lines normally use `ink` with alpha.

### 5b. Themes

A theme is five colours; a piece reads them from `g.c` and never hard-codes a hex. Select with
`?theme=mono|fieldnotes|night` (default `mono`; the article host uses `fieldnotes`).
`tint-1` and `tint-2` are always computed: ink mixed into paper at 35% and 12%.

| Token | `mono` | `fieldnotes` (light) | `night` |
|---|---|---|---|
| `paper` | `#E4E2DD` | `#E9E8E3` | `#121316` |
| `ink` | `#1B1A18` | `#141518` | `#EAE7E0` |
| `accent` | none | `#A8521F` (copper) | `#D98552` |
| `cool` | none | `#3F6688` (slate blue) | `#8FB0CF` |

`fieldnotes` follows the host publication's own system (warm paper, one copper accent, one
cool data colour). Its `paper` is the host's panel colour, because figures sit on tinted bands there.
Rules for `accent` and `cool` (same spirit as the host: colour is rationed to marks, never surfaces):
- **Accent:** at most 5% of ink coverage and one deliberate deviation per piece (the one line,
  tile, row or dot that breaks the rule). Never a fill, never a gradient, never glow. **Accent is
  optional and off by default.** Use colour only where it adds meaning to that piece (it marks the
  exception to the rule, or one object among many). A coloured thing that merely walks around the
  sheet reads as a magnifying glass or a cursor and is banned; the owner rejected it on F01, F06
  and F09. If used, it is thin and is part of the system's logic, not a mascot.
- **Cool:** only as the second layer when a piece has two line systems (e.g. the second moiré grid,
  the shadow dots). A piece never uses accent and cool for the same job.
- `night` inverts the meaning of ink: marks are light on dark, so halftone dot area follows
  luminance (lit side = bigger dots), not darkness. Build `night` only after `fieldnotes` looks right.

**Line weights** (fraction of the short edge S; at S = 1000 px):

| Name | Fraction | At 1000 px |
|---|---|---|
| hair | 0.0006 | 0.6 px |
| fine | 0.0012 | 1.2 px |
| line | 0.0025 | 2.5 px |
| bold | 0.006 | 6 px |
| mass | 0.02 | 20 px |

Floor: 0.75 device px. Below the floor, draw at the floor and scale alpha by `want/floor`,
so tone holds at avatar size.

**Margins:** poster and avatar `0.08 S`; hero `0.06 S` on the short axis. Full-bleed families
(F03, F05, F08, F09) still keep the subject's centre of mass inside the margin box.

**Grain** (on every piece, drawn last):
- Two pre-generated grey noise tiles, 241 px and 257 px square (coprime sizes, so no visible
  repeat), built once from the seed with the PRNG, each pixel luminance ±1 around mid-grey.
- Composite with `globalCompositeOperation = 'soft-light'`, alpha 0.10 (fine tile) and 0.06
  (second tile at 3x scale, reads as paper fibre).
- Grain size: about 1 px at 1000 px width; scale the pattern by `S/1000` with a minimum of 1
  device px.
- Target: on a flat paper area, luminance standard deviation 2 to 5 (of 255).
- Dust: 0 to 40 ink specks (radius 0.0004 to 0.0012 S, alpha 0.3 to 0.7), seeded, static.
- **Grain is static.** It belongs to the paper and does not shimmer. Ink marks get their own
  texture: per-stroke alpha 0.8 to 1.0 and width jitter ±10%, both seeded.

**Halftone:** allowed as a family technique (AM dots, 45°, pitch 0.006 to 0.012 S). No
whole-canvas error-diffusion dithering; it looks like a digital filter.

## 6. Motion spec

- **Loop length T:** 8, 12 or 16 s. Default 12 s. Avatars 8 s. (20 and 30 s are retired: they read as static.)
- **Alive from frame one.** The live clock starts at `meta.start` (a phase in [0,1) in the middle
  of peak activity), so the first second after load already shows clear motion.
  Slow is not imperceptible: a viewer must be able to point at what moves.
- **Speed band (measured as point speed in units of the short edge S per second):** across the
  loop, the 75th-percentile point moves at ≥ 0.03 S/s except for pauses of at most 1 s; the 99th percentile never exceeds 0.15 S/s. Every piece has one global motion (a wave, sweep or orbit
  that crosses the whole composition once per loop) plus local detail. Tempo varies: a slow
  swell plus a quicker gesture, not one monotone drift.
- **Phase:** `p = (t / T) % 1`, `θ = 2π p`. All motion is a function of θ, so frame(T) equals
  frame(0) exactly. Never integrate state across frames.
- **Loop noise:** `loopNoise(x, y, θ, r) = noise4(x, y, r cos θ, r sin θ)` (simplex sampled
  on a circle in 4D). `r` sets how much the field changes per loop: 0.3 calm, 0.8 lively.
- **Live evolution versus exact loop.** Two render modes. *Loop mode* (exports, video loops,
  `?t=` frames, tests): everything is a function of `θ`, frame(T) = frame(0) exactly. *Live mode*
  (the default on screen): the same piece keeps evolving and does not visibly repeat. The
  engine provides, and every piece uses:
  - `g.live` (boolean) and `g.drift` (seconds of unbounded slow time in live mode, 0 in loop mode).
  - `g.voice(k)`: the phase of independent voice `k`. Loop mode: `k·θ` for integer `k ≥ 1`. Live
    mode: `θ` times `k + ε_k`, with small irrational detunes (`ε_k` such as 0.0, 0.0618, 0.1414,
    0.0732), so voices drift against each other and the composition only recurs after hours.
  - `g.loop(x, y, r, th)`: in live mode the sampling circle's centre wanders through noise space
    with `g.drift`, so noise-driven fields never recur; in loop mode it is the closed circle.
  Rule: the main wave may keep period `T` in live mode, but at least two other aspects of the
  piece (amplitude envelope, density, angle delta, pitch, which elements are active) must run
  on different voices or on `g.drift`, so each pass of the main wave looks different from the last.
- **Easing:** sine in-out (`0.5 - 0.5 cos πu`) and `smootherstep` only.
  Banned: linear on anything that starts or stops; bounce, elastic, back-overshoot, springs.
  Constant angular speed is fine for continuous rotation (F04) because it never stops.
- **Breathing:** primary amplitude `a(θ) = 0.5 - 0.5 cos θ`, with a visible range (the piece
  changes by at least 30% of its amplitude between low and high, not a 5% tremble). Tempo
  breathes and may pause rarely, for at most 1 s. Prefer circulating motion (orbits, travelling waves, a
  phase that keeps advancing) over back-and-forth, which dwells at its extremes; where a
  reversal is unavoidable, overlap it with another element that is mid-move.
- **Stagger:** element phase offset `φ_i = k · u_i`, where `u_i ∈ [0,1)` is position along
  one axis and `k ≤ 0.5`. Offsets wrap because everything is periodic.
- **Ceilings:** point speed ≤ 0.15 S/s (see the speed band); an individual element rotates
  ≤ 15°/s, a whole figure ≤ 8°/s; a discrete event (tile flip) lasts at least 0.5 s, with no
  more than 4 starting per second.
- **Reduced motion:** each piece declares `still` (a phase in [0,1), its most composed frame).
  With `prefers-reduced-motion: reduce`, render `t = still · T` once and stop. The PNG
  export uses the same frame.

## 7. Engine contract

```js
// piece module shape (one file per piece, plain ES, no build step)
export const meta = { id: 'f01-schotter', T: 20, still: 0.35, aspects: ['4:5','16:9','1:1'] };
export function draw(ctx, { seed, t, w, h, g }) { /* pure: same args -> same pixels */ }
```

- **Coordinates:** `g` is set up by the shared `frame()` helper: origin at centre,
  short edge spans [-0.5, 0.5], long edge spans `±aspect/2`; `ctx` is already scaled so 1 unit
  = S device px. `g.S` (px), `g.lw(name)` (weight token to units, floor applied), `g.aspect`.
- **Determinism:** `draw` creates its own PRNG from `seed` on every call. No `Math.random`,
  no `Date`, no module-level state. Precompute per seed with a memo keyed on `seed` + size if needed.
- **PRNG:** `sfc32` seeded via `cyrb128(String(seed))`. Fast, 128-bit state, well known.
- **Aspects:** poster 4:5, hero 16:9, avatar 1:1. A piece composes on the short edge and
  extends or crops on the long edge; avatars may drop detail (`density` scaled by S).
- **Shared helpers** (`genart.js`, one file, target under 8 KB): `prng`, `noise4` and
  `loopNoise`, `grain` (tiles plus overlay), `ease` (sine, smootherstep), `clock` (phase from
  t and T, rAF loop, pause and resume), `frame` (unit transform, paper fill, line weights),
  `mount` (section 8), `exportPNG`, `exportWebm`, `exportFrames`. Nothing else until two families need it.
- **Exports:**
  - PNG: offscreen canvas at target size (e.g. 4000 x 5000), `t = still · T`, `toBlob`.
  - WebM loop: `canvas.captureStream(0)` plus `MediaRecorder`; step `t = i / fps` for exactly
    `T · fps` frames, calling `track.requestFrame()` after each. 30 fps.
  - Frame sequence: same stepping, PNG per frame via `showDirectoryPicker`; encode with
    ffmpeg for MP4 or GIF.
  - URL params: `?seed=…&aspect=4:5&export=png|webm|frames&size=…`.

## 8. Embedding (article use)

Pieces go into a public article: a single text column about 700 px wide, also 390 px phones,
with up to 4 pieces on one page. The host page's styling is unknown, so assume nothing.

- **Two modes, one code path.** (a) The piece's own HTML file inside an iframe
  (`width:100%; aspect-ratio:4/5; border:0`). (b) Inline: a container element plus one
  `<script type="module">` that calls `mount(el, { seed, aspect })`. The iframe file just calls
  `mount(document.body …)` too.
- **Self-contained.** Helpers are inlined into each piece file; no fonts, images, CDNs or any
  network request. Payload: piece file under 30 KB uncompressed.
- **Responsive to the container, not the window.** `ResizeObserver` on the container sets the
  CSS width; height comes from the aspect. Backing store = CSS size x `min(devicePixelRatio, 2)`,
  capped at 2.5 MP per canvas.
- **Pause offscreen.** `IntersectionObserver` (threshold 0) stops the rAF loop when the canvas
  leaves the viewport and on `visibilitychange` hidden. Resume continues from page time, so
  the loop phase stays consistent.
- **Reduced motion:** static `still` frame, also when the setting changes live (`matchMedia` listener).
- **No globals** beyond one guarded `window.genart` namespace; several pieces and repeated
  helper copies on one page must not clash. Nothing leaks into the host page's CSS.
- **Clean edge.** The piece paints its own `paper` background to the edge: no border, no
  radius, no shadow. Grey paper reads on both light and dark pages.
- **Accessibility:** canvas gets `role="img"` and an `aria-label` describing the piece in one
  sentence. Neither mode captures focus or scroll.
- **Public files:** no personal names, home paths, machine names, internal notes or tool
  attribution in any piece, comment or this spec. Neutral wording throughout.

**Perf budget (3 to 4 pieces on a page):**

| Measure | Budget |
|---|---|
| `draw` per frame, one piece at 700 CSS px wide, DPR 2, mid-range 2021 laptop | median ≤ 3 ms, p95 ≤ 6 ms |
| All visible pieces together | ≤ 8 ms per frame; usually only 1 or 2 are visible |
| Offscreen pieces | 0 ms (paused) |
| First paint of a piece after mount | ≤ 100 ms, including grain tile generation |
| Phone (390 px, DPR 3 capped to 2) | holds 60 fps; else the piece drops to 30 fps on its own (skip every other rAF) |

Heavy families (F05, F10, F11) cache static layers on an offscreen canvas and redraw only the moving parts.

## 9. Acceptance checks (per piece)

1. **Deterministic:** render `draw` twice with the same seed and t into two offscreen canvases;
   `getImageData` buffers are byte-identical. A different seed gives a different hash.
2. **Seamless:** frame(t = 0) and frame(t = T) are byte-identical; frame(T - 1/30) differs from
   frame(0) by at most one step of motion (visual check on a flip-book of the last and first 5 frames).
3. **Aspects:** a contact page shows the piece at 4:5, 16:9 and 1:1; the subject sits inside the
   margin box in all three and nothing important is cropped.
4. **Widths:** screenshots at 390x844 and 1280x800 of a test article page with the piece embedded
   both ways (iframe and inline); fills the column, no horizontal scroll, no blurry upscale.
5. **Perf:** `performance.now()` around `draw` over 120 frames meets the budget table; with 4
   pieces on the test page, scrolling one out of view drops its cost to zero (log shows paused).
6. **Grain:** at 100% zoom on a flat paper area, grain is visible (std dev 2 to 5) with no
   visible tile repeat; it does not read as dirt or noise on the ink.
7. **Palette:** `mono`: every pixel has saturation under 0.04 (HSL). `fieldnotes` and `night`:
   sampled pixels are only mixes of the theme's colours (hue check), and `accent` pixels cover
   at most 5% of the ink coverage.
8. **Motion:** point-speed band of section 6 (p75 ≥ 0.03 S/s with no stretch over 1 s below it,
   p99 ≤ 0.15 S/s); pauses of at most 1 s, rare; motion is visible within the
   first second after load; no easing outside section 6. A piece that fails the lower bound is
   too static even if every other check passes.
8b. **Smoothness:** in a real browser at the largest preview size (a 4:5 canvas of about 1000 x
   1250 CSS px at DPR 2, which the engine caps at 2.5 MP), 10 s of live running shows no frame
   gap over 40 ms and a median frame time under 17 ms. Heavy pieces scale their element counts
   by `g.q`, the engine's adaptive quality factor (1 in tests and exports).
11. **Evolves live:** in live mode, the point configuration at `t + T` differs from the one at
   `t`: median point displacement ≥ 0.02 S over at least 30% of the points, for several `t`
   across 60 s. In loop mode checks 1 and 2 still hold unchanged.
9. **Reduced motion:** with the setting on, exactly one frame is drawn and it equals the PNG export.
12. **Not blank:** at `still`, 0.25 T, 0.5 T and 0.75 T (loop mode) between 0.5% and 40% of pixels differ from a paper-only render of the same size by more than 6/255 luminance; a piece that draws nothing must fail.
10. **Network and payload:** devtools shows zero requests after the piece file; file under 30 KB.
