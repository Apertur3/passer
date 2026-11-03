// Build: node scripts/build.mjs. Writes dist/<id>.mjs (module), dist/<id>.html (self-contained),
// dist/pieces.json. The html inlines the same module text, so tests of the .mjs test the shipped code.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)), rd = p => readFileSync(root + p, 'utf8');
const strip = s => s.replace(/^export\s+/gm, '');
const helpers = strip(rd('src/genart.js'));
const names = 'meta,draw,render,theme,exportPNG,exportWebm,exportFrames';
const boot = id => `
const q = new URLSearchParams(location.search), o = { seed: q.get('seed') ?? '1', aspect: q.get('aspect') || undefined,
  theme: q.get('theme') || 'mono', t: q.has('t') ? +q.get('t') : undefined, params: {}, fit: true };
q.forEach((v, k) => k.startsWith('p.') && (o.params[k.slice(2)] = +v));
document.body.style.background = theme(o.theme).paper;
const ex = q.get('export'), P = { meta, draw }, sz = q.get('size') || undefined;
if (ex === 'png') exportPNG(P, { ...o, size: sz }).then(b => save(b, '${id}.png'));
else if (ex === 'webm') exportWebm(P, { ...o, size: sz }).then(b => save(b, '${id}.webm'));
else if (ex === 'frames') { const b = document.createElement('button'); b.textContent = 'Choose folder'; b.onclick = () => exportFrames(P, { ...o, size: sz }); document.body.append(b); }
else mountPiece(document.body, o);
`;
mkdirSync(root + 'dist', { recursive: true });
const list = [];
for (const f of readdirSync(root + 'src/pieces').filter(f => f.endsWith('.js')).sort()) {
  const src = rd('src/pieces/' + f);
  if (/^import\s/m.test(src)) throw new Error(f + ': pieces must not import');
  const body = `${helpers}\n${strip(src)}\nconst mountPiece = (el, o) => mount(el, { piece: { meta, draw }, ...o });\n(window.genart ||= {}).mount ??= mountPiece;\n`;
  const meta = (0, eval)('(' + src.match(/export const meta = (\{[\s\S]*?\n\});/)[1] + ')');
  writeFileSync(`${root}dist/${meta.id}.mjs`, `${body}export { ${names}, mountPiece as mount };\n`);
  const html = `<!doctype html>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${meta.title}</title>\n<style>html,body{margin:0;height:100%}body{display:grid;place-items:center;overflow:hidden}</style>\n<script type="module">\n${body}${boot(meta.id)}</script>\n`;
  writeFileSync(`${root}dist/${meta.id}.html`, html);
  if (html.length > 30720) throw new Error(`${meta.id}.html is ${html.length} bytes, limit 30720`);
  list.push({ ...meta, file: meta.id + '.html', module: meta.id + '.mjs', bytes: html.length });
  console.log(meta.id, html.length, 'bytes');
}
writeFileSync(root + 'dist/pieces.json', JSON.stringify(list, null, 1));
