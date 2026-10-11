const assert = require('assert/strict');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { createApp } = require('../src/app');
const frontendDir = path.resolve(__dirname, '../../frontend/dist/name-register');
const html = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
const db = { command: async () => ({ ok: 1 }) };
let server;
function get(url) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: server.address().port, path: url }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}
async function run() {
  server = await new Promise(resolve => {
    const s = createApp(db, { frontendDir }).listen(0, '127.0.0.1', () => resolve(s));
  });
  for (const route of ['/', '/add', '/contacts']) {
    const result = await get(route);
    assert.equal(result.status, 200);
    assert.equal(result.body, html);
    assert.equal(result.headers['cache-control'], 'no-cache');
  }
  for (const asset of html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)) {
    const result = await get('/' + asset[1]);
    assert.equal(result.status, 200);
    assert.match(result.headers['cache-control'], /immutable/);
    assert.notEqual(result.body, html);
  }
  for (const route of ['/api/missing', '/missing.js', '/missing-page']) {
    assert.equal((await get(route)).status, 404);
  }
  assert.equal(JSON.parse((await get('/api/health')).body).database, 'connected');
  await new Promise(resolve => server.close(resolve));
  server = await new Promise(resolve => {
    const s = createApp(db).listen(0, '127.0.0.1', () => resolve(s));
  });
  assert.equal((await get('/')).status, 404); // Local API does not serve production assets.
  const env = { ...process.env, NODE_ENV: 'production' };
  delete env.MONGODB_URI;
  const startup = spawnSync(process.execPath, [path.resolve(__dirname, '../src/server.js')], { env, encoding: 'utf8' });
  assert.notEqual(startup.status, 0);
  assert.match(startup.stderr, /MONGODB_URI is required/);
  console.log('PASS: production pages, compiled assets, cache headers, API/asset 404s, local separation, missing production URI.');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { if (server) server.close(); });
