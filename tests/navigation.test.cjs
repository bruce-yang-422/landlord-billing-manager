const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const screens = ['calculate', 'input', 'backup', 'settings'].map(screen => ({ dataset: { screen }, hidden: false }));
  const buttons = screens.map(panel => ({ dataset: { nav: panel.dataset.screen }, attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } }));
  const events = {};
  const panels = Object.fromEntries(['meterEntry','billingEntry','meterModeBtn','billingModeBtn'].map(id => [id, { hidden: false, attributes: {}, setAttribute(key,value) { this.attributes[key] = value; } }]));
  let refreshes = 0;
  const ctx = vm.createContext({
    location: { hash: '' },
    document: { querySelectorAll: selector => selector === '[data-screen]' ? screens : buttons, querySelector: () => ({ focus() {} }), getElementById: id => panels[id] },
    window: { scrollTo() {}, addEventListener: (name, callback) => { events[name] = callback; } },
    refreshBillingReadings() { refreshes++; }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/navigation.js'), 'utf8'), ctx);
  return { ctx, screens, buttons, events, panels, get refreshes() { return refreshes; } };
}

test('each route shows exactly one screen and tracks the active navigation item', () => {
  const h = setup(); h.ctx.initNavigation();
  for (const screen of ['settings', 'input', 'backup', 'calculate']) {
    h.ctx.navigateTo(screen); h.events.hashchange();
    assert.deepEqual(h.screens.filter(panel => !panel.hidden).map(panel => panel.dataset.screen), [screen]);
    assert.deepEqual(h.buttons.filter(button => button.attributes['aria-current'] === 'page').map(button => button.dataset.nav), [screen]);
  }
});

test('browser back, legacy links and unknown fragments render the appropriate screen', () => {
  const h = setup(); h.ctx.initNavigation();
  h.ctx.location.hash = '#settings'; h.events.hashchange();
  h.ctx.location.hash = '#calculate'; h.events.hashchange();
  assert.equal(h.screens[0].hidden, false);
  h.ctx.location.hash = '#unknown'; h.events.hashchange();
  assert.equal(h.screens[0].hidden, false);
  h.ctx.location.hash = '#entry'; h.events.hashchange();
  assert.equal(h.screens[1].hidden, false);
  h.ctx.location.hash = '#history'; h.events.hashchange();
  assert.equal(h.screens[2].hidden, false);
});
