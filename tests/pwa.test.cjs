const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function worker(scope = 'https://example.test/landlord-billing-manager/') {
  const events = {};
  const stores = new Map();
  let claimed = false;
  let networkCalls = 0;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(requests) {
          for (const request of requests) {
            assert.equal(request.cache, 'reload');
            const relative = new URL(request.url).pathname.slice(new URL(scope).pathname.length);
            const file = path.join(root, relative || 'index.html');
            entries.set(request.url, new Response(fs.readFileSync(file)));
          }
        },
        async match(key) { return entries.get(key)?.clone(); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8'), {
    self: {
      registration: { scope },
      clients: { async claim() { claimed = true; } },
      addEventListener(name, handler) { events[name] = handler; }
      // skipWaiting deliberately absent: updates must wait for open pages.
    },
    caches, URL, Request, Response,
    fetch() { networkCalls++; return Promise.reject(new Error('offline')); }
  });
  return {
    stores,
    get claimed() { return claimed; },
    get networkCalls() { return networkCalls; },
    async lifecycle(name) {
      const tasks = [];
      events[name]({ waitUntil(task) { tasks.push(task); } });
      await Promise.all(tasks);
    },
    request(relative, mode = 'navigate', method = 'GET') {
      let response;
      events.fetch({
        request: { url: new URL(relative, scope).href, mode, method },
        respondWith(value) { response = value; }
      });
      return response;
    }
  };
}

for (const scope of ['https://example.test/', 'https://example.test/landlord-billing-manager/']) {
  test(`offline app and assets work at ${scope}`, async () => {
    const sw = worker(scope);
    await sw.lifecycle('install');
    await sw.lifecycle('activate');
    assert.equal(sw.claimed, true);
    for (const url of ['./', './index.html', './?source=installed']) {
      assert.match(await (await sw.request(url)).text(), /房東帳務管理工具/);
    }
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css|png|ico|webmanifest))"/g)];
    for (const [, asset] of assets) {
      const response = await sw.request(asset, 'cors');
      assert.ok(response?.ok, `offline asset: ${asset}`);
    }
    assert.ok((await sw.request('./js/pwa.js?v=4', 'cors')).ok);
    assert.equal(sw.networkCalls, 0);
  });
}

test('activation only removes obsolete caches belonging to the same scope', async () => {
  const sw = worker();
  const old = 'landlord-billing-https://example.test/landlord-billing-manager/-v0';
  const other = 'landlord-billing-https://example.test/other/-v0';
  sw.stores.set(old, new Map());
  sw.stores.set(other, new Map());
  sw.stores.set('unrelated-app', new Map());
  await sw.lifecycle('install');
  await sw.lifecycle('activate');
  assert.equal(sw.stores.has(old), false);
  assert.equal(sw.stores.has(other), true);
  assert.equal(sw.stores.has('unrelated-app'), true);
});

test('unrelated requests bypass the app cache', () => {
  const sw = worker();
  for (const url of ['https://external.test/', '/other/', './missing.html', './api/bills']) {
    assert.equal(sw.request(url), undefined);
  }
  assert.equal(sw.request('./index.html', 'navigate', 'POST'), undefined);
});

test('manifest icons exist and have their declared PNG dimensions', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  for (const icon of manifest.icons) {
    const data = fs.readFileSync(path.join(root, icon.src));
    assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`, icon.sizes);
  }
});
