#!/usr/bin/env node
// Designer-seat fonts: vendor Google Fonts families as local woff2 files, so a mockup can use
// real typefaces and still pass the "no external URLs" gate.
// Usage: node ~/.claude/conductor/bin/design-fonts.mjs <design dir> "<css2 family spec>" [...]
//   spec examples: "Fraunces:ital,wght@0,400;0,700;1,400"   "Inter Tight:wght@400;600"   "Newsreader:opsz,wght@6..72,300..800"
// Writes <design dir>/fonts/<family-slug>.css (+ its .woff2 files, latin subset). Link it from the mockup with a
// relative href. Only fonts.googleapis.com and fonts.gstatic.com are contacted.
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const SUBSETS = new Set(['latin']);

function fail(msg) { console.error(`design-fonts: ${msg}`); process.exit(2); }

const [dirArg, ...specs] = process.argv.slice(2);
if (!dirArg || !specs.length) fail('usage: design-fonts.mjs <design dir> "<Family:axes@values>" [...]');
if (!existsSync(dirArg)) fail(`design dir not found: ${dirArg}`);
const dir = realpathSync(dirArg);
const root = realpathSync(process.cwd());
if (dir !== root && !dir.startsWith(root + path.sep)) fail('design dir must be inside the current working directory');
if (!path.relative(root, dir).split(path.sep).includes('design')) fail('design dir must be a design/ directory or inside one');

const fontsDir = path.join(dir, 'fonts');
mkdirSync(fontsDir, { recursive: true });
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

for (const spec of specs) {
  const family = spec.split(':')[0].trim();
  if (!/^[A-Za-z0-9 ]+$/.test(family)) fail(`bad family name: ${family}`);
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(spec).replace(/%20/g, '+')}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) fail(`${family}: Google Fonts returned ${res.status} for spec "${spec}" (check the family name and axis syntax)`);
  const css = await res.text();

  // Blocks look like: /* latin */\n@font-face { ... }
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]*})/g)].filter(m => SUBSETS.has(m[1]));
  if (!blocks.length) fail(`${family}: no latin @font-face blocks in the response`);

  const out = [];
  for (const [, , block] of blocks) {
    const src = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!src) fail(`${family}: unexpected @font-face without a gstatic url`);
    const style = (block.match(/font-style:\s*(\w+)/) || [, 'normal'])[1];
    const weight = (block.match(/font-weight:\s*([\d ]+)/) || [, '400'])[1].trim().replace(/\s+/g, '-');
    const fileName = `${slug(family)}-${style}-${weight}.woff2`;
    const bin = await fetch(src[1]);
    if (!bin.ok) fail(`${family}: download failed (${bin.status})`);
    writeFileSync(path.join(fontsDir, fileName), Buffer.from(await bin.arrayBuffer()));
    out.push(block.replace(src[0], `url(${fileName})`));
  }
  const cssFile = path.join(fontsDir, `${slug(family)}.css`);
  writeFileSync(cssFile, `/* ${family} — Google Fonts spec "${spec}" (latin subset), vendored for the mockup. */\n${out.join('\n')}\n`);
  console.log(`${family}: ${out.length} face(s) -> ${path.relative(root, cssFile)}`);
  console.log(`  link from the mockup with a RELATIVE href to that css file; record the spec "${spec}" in the design doc for the implementer`);
}
