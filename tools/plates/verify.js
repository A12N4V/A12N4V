// Decode a GIF with the browser's own decoder (ImageDecoder) and dump chosen frames as PNG.
//   node tools/plates/verify.js assets/x.gif 0,12,30
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright');
(async () => {
  const [file, list = '0'] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.route('http://localhost/', (r) => r.fulfill({ contentType: 'text/html', body: '<body></body>' }));
  await p.goto('http://localhost/');
  const res = await p.evaluate(async ({ data, idx }) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const dec = new ImageDecoder({ data: bytes, type: 'image/gif' });
    await dec.tracks.ready; const n = dec.tracks.selectedTrack.frameCount;
    const out = [];
    for (const i of idx) {
      if (i >= n) continue;
      const { image } = await dec.decode({ frameIndex: i });
      const c = new OffscreenCanvas(image.displayWidth, image.displayHeight); c.getContext('2d').drawImage(image, 0, 0);
      const blob = await c.convertToBlob(); const buf = new Uint8Array(await blob.arrayBuffer());
      let s = ''; for (let k = 0; k < buf.length; k += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(k, k + 0x8000));
      out.push([i, btoa(s)]);
    }
    return { n, out };
  }, { data: fs.readFileSync(file).toString('base64'), idx: list.split(',').map(Number) });
  console.log('frames:', res.n);
  for (const [i, d] of res.out) { const o = path.join(__dirname, 'out', `${path.basename(file, '.gif')}-f${i}.png`); fs.writeFileSync(o, Buffer.from(d, 'base64')); console.log(o); }
  await b.close();
})();
