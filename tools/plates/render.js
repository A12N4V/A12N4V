// Render the profile plates headlessly.
//   node tools/plates/render.js [plate ...] [--preview]
// Source art is read from the homonin-landing checkout (HOMONIN_MEDIA, default
// ../homonin-landing/apps/web/public/media) and from this repo's assets/.
// Output: assets/<plate>.gif|png, or $PLATES_OUT (--preview: key frame as PNG into tools/plates/out/)
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');

const ROOT = path.resolve(__dirname, '../..');
const MEDIA = process.env.HOMONIN_MEDIA || path.resolve(ROOT, '../homonin-landing/apps/web/public/media');
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.js': 'text/javascript; charset=utf-8', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };

(async () => {
  const args = process.argv.slice(2);
  const preview = args.includes('--preview');
  const plates = args.filter((a) => !a.startsWith('--'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.route('http://plates.local/**', (route) => {
    const u = new URL(route.request().url());
    let p = decodeURIComponent(u.pathname);
    const file = p.startsWith('/media/') ? path.join(MEDIA, p.slice(7))
      : p.startsWith('/assets/') ? path.join(ROOT, p)
      : p.startsWith('/src/') ? path.join(__dirname, p)
      : path.join(__dirname, p);
    if (p === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'missing ' + file });
    route.fulfill({ contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  await page.goto('http://plates.local/');
  await page.addScriptTag({ url: 'http://plates.local/engine.js' });
  await page.addScriptTag({ url: 'http://plates.local/plates.js' });
  if (process.env.DBG) await page.addScriptTag({ url: 'http://plates.local/dbg.js' });
  await page.evaluate(() => document.fonts.ready);
  const names = plates.length ? plates : await page.evaluate(() => Object.keys(PLATES));
  for (const name of names) {
    const t = Date.now();
    const res = await page.evaluate(async ({ name, preview }) => {
      const r = await PLATES[name]();
      if (preview || r.frames.length === 1) return { ext: 'png', data: toPNG(r.frames[preview ? (r.preview ?? 0) : 0]).split(',')[1] };
      return { ext: 'gif', data: b64(encodeGIF(r.frames, r.delays)) };
    }, { name, preview });
    const outDir = preview ? path.join(__dirname, 'out') : path.resolve(ROOT, process.env.PLATES_OUT || 'assets');
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, `${name}.${res.ext}`);
    fs.writeFileSync(out, Buffer.from(res.data, 'base64'));
    console.log(`${name} -> ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${((Date.now() - t) / 1000).toFixed(1)}s)`);
  }
  await browser.close();
})();
