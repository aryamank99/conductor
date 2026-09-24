#!/usr/bin/env node
// Designer-seat eyes: screenshot a local mockup so the designer can critique its own work.
// Usage: node ~/.claude/conductor/bin/design-shot.mjs <path/to/mockup.html> [width ...]
// Writes <mockup dir>/shots/<name>-<width>-<n>.png (viewport-height tiles, top to bottom).
// Only local files load: every http(s) request is blocked and reported, so the shot also
// shows exactly what the "no external URLs" gate would see.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, realpathSync, readdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const VERIFY_DIR = '/tmp/conductor-verify';
const TILE_HEIGHT = 1400;
const MAX_TILES = 12;

function fail(msg) { console.error(`design-shot: ${msg}`); process.exit(2); }

const [target, ...widthArgs] = process.argv.slice(2);
if (!target) fail('usage: design-shot.mjs <mockup.html> [width ...]');
if (!target.endsWith('.html')) fail('target must be an .html file');
if (!existsSync(target)) fail(`not found: ${target}`);

// Fence: the file must be inside the current repo AND inside a design/ directory.
const file = realpathSync(target);
const root = realpathSync(process.cwd());
if (!file.startsWith(root + path.sep)) fail('target must be inside the current working directory');
if (!path.relative(root, file).split(path.sep).includes('design')) fail('target must be inside a design/ directory');

const widths = widthArgs.length ? widthArgs.map(Number) : [1280];
if (widths.some(w => !Number.isInteger(w) || w < 280 || w > 2560)) fail('widths must be integers 280..2560');

// Warm the shared Playwright install on first use (never the project's package.json).
if (!existsSync(path.join(VERIFY_DIR, 'node_modules', 'playwright'))) {
  mkdirSync(VERIFY_DIR, { recursive: true });
  if (!existsSync(path.join(VERIFY_DIR, 'package.json'))) execFileSync('npm', ['init', '-y'], { cwd: VERIFY_DIR, stdio: 'ignore' });
  execFileSync('npm', ['install', 'playwright'], { cwd: VERIFY_DIR, stdio: 'inherit' });
  execFileSync('npx', ['playwright', 'install', 'chromium'], { cwd: VERIFY_DIR, stdio: 'inherit' });
}
const require = createRequire(path.join(VERIFY_DIR, 'package.json'));
const { chromium } = require('playwright');

const outDir = path.join(path.dirname(file), 'shots');
mkdirSync(outDir, { recursive: true });
const base = path.basename(file, '.html');
for (const f of readdirSync(outDir)) if (f.startsWith(base + '-') && f.endsWith('.png')) unlinkSync(path.join(outDir, f));

const browser = await chromium.launch();
const blocked = new Set();
const consoleErrors = [];
try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: TILE_HEIGHT } });
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      blocked.add(url);
      return route.abort();
    });
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));
    await page.goto('file://' + file, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const tiles = Math.min(MAX_TILES, Math.ceil(fullHeight / TILE_HEIGHT));
    for (let i = 0; i < tiles; i++) {
      const y = i * TILE_HEIGHT;
      const out = path.join(outDir, `${base}-${width}-${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: out, fullPage: true, clip: { x: 0, y, width, height: Math.min(TILE_HEIGHT, fullHeight - y) } });
      console.log(out);
    }
    if (fullHeight > TILE_HEIGHT * MAX_TILES) console.log(`note: page is ${fullHeight}px tall at ${width}px; only the first ${MAX_TILES} tiles were captured`);
    const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight} ${f.style}`));
    console.log(`fonts loaded at ${width}px: ${fonts.length ? [...new Set(fonts)].join(', ') : 'none (system fonts only)'}`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (blocked.size) console.log(`BLOCKED external requests (the artifact gate will fail): ${[...blocked].join(' ')}`);
if (consoleErrors.length) console.log(`console errors: ${consoleErrors.slice(0, 10).join(' | ')}`);
