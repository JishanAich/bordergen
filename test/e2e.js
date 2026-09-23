// End-to-end check: drives headless Chrome over CDP - loads the app, moves knobs, switches styles, uploads an image, runs the demo.
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = process.argv[2] || os.tmpdir();
const PORT = 9333 + Math.floor(Math.random() * 500);
// Resolves after ms milliseconds.
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Writes a tiny grayscale PNG (dark leaf on white) so the upload path can be tested without image libraries.
function makeLeafPng(file) {
  const w = 160, h = 200, rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(w + 1, 255); row[0] = 0;
    const t = (y - 15) / 170;
    for (let x = 0; x < w; x++) if (t >= 0 && t <= 1 && Math.abs(x - 80) <= 55 * Math.sin(Math.PI * t) ** 0.8 * (1 - 0.3 * t)) row[x + 1] = 30;
    rows.push(row);
  }
  // Builds one PNG chunk (length, type, data, CRC).
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]));
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bg-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); if (targets.find(t => t.type === 'page')) break; } catch (e) { /* chrome still starting */ }
    await sleep(200);
  }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = {}, errors = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map(a => a.value || a.description).join(' '));
  });
  // Sends a CDP command and resolves with its response message.
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  // Evaluates a JS expression in the page and returns its value (throws on page exceptions).
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };
  // Saves a PNG screenshot of the page into the output directory.
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(r.result.data, 'base64')); };
  // Prints PASS/FAIL for a check and sets a failing exit code on FAIL.
  const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) process.exitCode = 1; };

  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
  await send('Page.navigate', { url: process.env.APP_URL || 'file:///D:/CXA/bordergen/index.html' });
  await sleep(1500);
  ok(await ev('!!document.querySelector("#frame svg")'), 'svg rendered on load');
  const svg0 = await ev('BGApp.lastSvg().length');

  await ev('BGApp.setKnob("N", 3)'); await sleep(300);
  ok((await ev('BGApp.lastSvg().length')) !== svg0, 'harmonics slider changes the border');
  ok((await ev('document.getElementById("s-N").value')) === '3', 'slider UI follows setKnob');
  await sleep(5500); await shot('e2e-epicycle');

  for (const s of ['madhubani', 'warli', 'gond', 'pattachitra']) {
    await ev('BGApp.setStyle("' + s + '")'); await sleep(250);
    const valid = await ev('(()=>{const d=new DOMParser().parseFromString(BGApp.lastSvg(),"image/svg+xml");return !d.querySelector("parsererror")&&!!d.getElementById("side-top")&&!!d.getElementById("corner-1")})()');
    ok(valid, 'style ' + s + ' produces valid SVG with named groups');
  }

  // Lab: rosette shape + symmetry.
  await ev('(()=>{const s=document.getElementById("labShape");s.value="rosette";s.dispatchEvent(new Event("change"))})()'); await sleep(400);
  ok(/3 circles/.test(await ev('document.getElementById("epiReadout").textContent')), 'rosette lab shape shows 3 circles');
  await shot('e2e-rosette');
  await ev('(()=>{const s=document.getElementById("labShape");s.value="primary";s.dispatchEvent(new Event("change"))})()');

  // Upload a synthetic silhouette through the real file input.
  const png = path.join(os.tmpdir(), 'bg-leaf.png'); makeLeafPng(png);
  const doc = await send('DOM.getDocument'); const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#upload' });
  await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: [png] }); await sleep(1200);
  ok((await ev('BGApp.state.motifA')) === 'custom', 'uploaded image becomes motif A');
  console.log('   upload msg:', await ev('document.getElementById("uploadMsg").textContent'));
  await ev('BGApp.setKnob("morph", 50)'); await sleep(300); await shot('e2e-upload');

  // Exports: stub the download hook, click each button, and inspect what would have been saved.
  await ev('(()=>{window.__dl=[];BG.download=(b,n)=>window.__dl.push({size:b.size,name:n,type:b.type});})()');
  await ev('BGApp.setStyle("pattachitra")'); await sleep(200);
  for (const id of ['exSvg', 'exPng', 'exJson']) await ev('document.getElementById("' + id + '").click()');
  await sleep(1500);
  const dl = await ev('window.__dl');
  // Finds the captured download whose filename ends with the given extension.
  const by = ext => dl.find(d => d.name.endsWith(ext));
  ok(by('.svg') && by('.svg').size > 50000 && by('.svg').type === 'image/svg+xml', 'SVG export ' + (by('.svg') ? Math.round(by('.svg').size / 1024) + ' KB' : 'missing'));
  ok(by('.png') && by('.png').size > 20000 && by('.png').type === 'image/png', 'PNG export ' + (by('.png') ? Math.round(by('.png').size / 1024) + ' KB' : 'missing'));
  ok(by('.json') && by('.json').size > 500, 'JSON export ' + (by('.json') ? by('.json').size + ' B' : 'missing'));
  await shot('e2e-final');

  // Focus mode via the F key enlarges the stage.
  await send('Emulation.setDeviceMetricsOverride', { width: 1300, height: 1100, deviceScaleFactor: 1, mobile: false }); await sleep(300);
  const w0 = await ev('document.querySelector("#frame svg").getBoundingClientRect().width');
  await ev('window.dispatchEvent(new KeyboardEvent("keydown",{key:"f"}))'); await sleep(200);
  const w1 = await ev('document.querySelector("#frame svg").getBoundingClientRect().width');
  ok(w1 > w0 * 1.2, 'focus mode enlarges the border (' + Math.round(w0) + ' -> ' + Math.round(w1) + ' px)');
  await shot('e2e-focus');
  await ev('window.dispatchEvent(new KeyboardEvent("keydown",{key:"f"}))'); await sleep(200);

  // Auto demo starts, narrates, and can be stopped.
  await ev('document.getElementById("autoDemo").click()'); await sleep(2500);
  ok(await ev('document.getElementById("autoDemo").classList.contains("on")'), 'auto demo running');
  console.log('   demo says:', await ev('document.getElementById("narration").textContent'));
  ok((await ev('document.getElementById("narration").textContent')).length > 10, 'narration shown under the frame');
  await shot('e2e-demo');
  await ev('document.getElementById("autoDemo").click()'); await sleep(200);
  ok(!(await ev('document.getElementById("autoDemo").classList.contains("on")')), 'auto demo stops');

  ok(errors.length === 0, 'no console errors / exceptions' + (errors.length ? ': ' + errors.join(' | ') : ''));
  ws.close(); chrome.kill();
  setTimeout(() => process.exit(process.exitCode || 0), 300);
})().catch(e => { console.error('E2E crashed:', e); process.exit(1); });
