function navigateTo(screen) {
  if (!['calculate', 'input', 'backup', 'settings'].includes(screen)) screen = 'calculate';
  if (location.hash !== '#' + screen) location.hash = '#' + screen;
  else renderScreen();
}

function renderScreen() {
  const fragment = location.hash.slice(1);
  const requested = ({ entry: 'input', history: 'backup' })[fragment] || fragment;
  const screen = ['calculate', 'input', 'backup', 'settings'].includes(requested) ? requested : 'calculate';
  if (screen === 'calculate' && typeof updateBillTotals === 'function') updateBillTotals();
  document.querySelectorAll('[data-screen]').forEach(panel => { panel.hidden = panel.dataset.screen !== screen; });
  document.querySelectorAll('[data-nav]').forEach(button => {
    if (button.dataset.nav === screen) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const heading = document.querySelector(`[data-screen="${screen}"] h2`);
  heading?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function initNavigation() {
  window.addEventListener('hashchange', renderScreen);
  renderScreen();
}
