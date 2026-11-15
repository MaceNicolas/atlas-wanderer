// Drives a headless Chrome (Chrome DevTools Protocol, no dependency) to SEE a page of the project working: opens a URL, runs a script of steps, prints what it returns, and
// can save a screenshot. Used to check the editor (site/editor.html) and the game in a real browser.
// Usage: node tools/browser-probe.js <url> <script.js>     (the script exports  async page => { ... })  with
//   page.eval(expression)  runs JavaScript in the page and returns the value     page.sleep(ms)     page.shot(file.png)     page.errors  (page exceptions)
// Setup: CH = path of chrome-headless-shell (installed by Playwright: ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell).
//   If it complains about libasound.so.2:  apt-get download libasound2t64 && dpkg -x libasound2t64_*.deb <dir>   then  AW_LIBS=<dir>/usr/lib/x86_64-linux-gnu
//   Start the local server first (tools/serve.sh 8099), open  http://localhost:8099/site/editor.html?mod=atlas-wanderer  and do not click "Enregistrer": nothing must be saved.
// Example of a script: see the checks of the type / target / rule fields in the session of 14 November 2026 (select a card of the list, change a select, read [data-desc]).
'use strict';
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const CH = process.env.CH, LIBS = process.env.AW_LIBS || '';
if (!CH) { console.log('Set CH to the path of chrome-headless-shell (see the header of this file).'); process.exit(1); }
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-probe-'));
  const proc = spawn(CH, ['--no-sandbox', '--remote-debugging-port=9333', '--window-size=' + (process.env.AW_SIZE || '1300,1000'), '--user-data-dir=' + profile, process.argv[2]], { env: { ...process.env, LD_LIBRARY_PATH: LIBS }, stdio: 'ignore' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let list; for (let i = 0; i < 40; i++) { try { list = await (await fetch('http://127.0.0.1:9333/json')).json(); if (list.find(t => t.type === 'page')) break; } catch (e) { /* not ready */ } await sleep(250); }
  const tab = list.find(t => t.type === 'page'), ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });
  let id = 0; const pending = {}, errors = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
    else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text);
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map(x => x.value || x.description).join(' '));
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  const page = {
    sleep, errors,
    eval: async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception || r.result.exceptionDetails)); return r.result.result.value; },
    shot: async file => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); }
  };
  try { await require(path.resolve(process.argv[3]))(page); } catch (e) { console.log('SCRIPT ERROR', e.message); }
  console.log('page errors:', JSON.stringify(errors));
  ws.close(); proc.kill(); fs.rmSync(profile, { recursive: true, force: true }); process.exit(0);
})();
