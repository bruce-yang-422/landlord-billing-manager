// PWA 安裝提示：Chromium 原生安裝視窗 + iPhone / iPad 手動教學
(function () {
  'use strict';

  const DISMISS_KEY = 'landlord_pwa_install_dismissed_at';
  const VISIT_KEY = 'landlord_pwa_visit_count';
  const SESSION_KEY = 'landlord_pwa_install_hidden';
  const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000;

  const card = document.getElementById('pwaInstallCard');
  const title = document.getElementById('pwaInstallTitle');
  const description = document.getElementById('pwaInstallDescription');
  const actionButton = document.getElementById('pwaInstallActionBtn');
  const dismissButton = document.getElementById('pwaInstallDismissBtn');
  const iosDialog = document.getElementById('pwaIosDialog');
  const iosCloseButton = document.getElementById('pwaIosDialogCloseBtn');
  const iosDoneButton = document.getElementById('pwaIosDialogDoneBtn');

  if (!card || !actionButton || !dismissButton) return;

  let deferredPrompt = null;
  let hasEngagement = false;
  let promotionTimer = null;

  function readStorage(storage, key, fallback = null) {
    try {
      const value = storage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      console.warn(`Unable to read ${key}:`, error);
      return fallback;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch (error) {
      console.warn(`Unable to write ${key}:`, error);
    }
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function isIosDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function getVisitCount() {
    const previous = Number.parseInt(readStorage(localStorage, VISIT_KEY, '0'), 10) || 0;
    const current = previous + 1;
    writeStorage(localStorage, VISIT_KEY, String(current));
    return current;
  }

  function isDismissed() {
    const dismissedAt = Number.parseInt(readStorage(localStorage, DISMISS_KEY, '0'), 10) || 0;
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION;
  }

  function isHiddenForSession() {
    return readStorage(sessionStorage, SESSION_KEY, '0') === '1';
  }

  function hideCard() {
    card.hidden = true;
    if (promotionTimer) {
      window.clearTimeout(promotionTimer);
      promotionTimer = null;
    }
  }

  function configureCard() {
    if (isIosDevice()) {
      title.textContent = '將房東帳務加入主畫面';
      description.textContent = '點擊分享，再選擇「加入主畫面」。';
      actionButton.textContent = '查看步驟';
    } else {
      title.textContent = '安裝房東帳務 App';
      description.textContent = '從桌面快速開啟，也能離線記帳。';
      actionButton.textContent = '安裝 App';
    }
  }

  function canPromote() {
    const platformCanInstall = isIosDevice() || deferredPrompt !== null;
    return platformCanInstall &&
      !isStandalone() &&
      !isDismissed() &&
      !isHiddenForSession();
  }

  function showCard(delay = 0) {
    if (!canPromote()) return;

    if (promotionTimer) window.clearTimeout(promotionTimer);
    promotionTimer = window.setTimeout(() => {
      promotionTimer = null;
      if (!canPromote()) return;
      configureCard();
      card.hidden = false;
    }, delay);
  }

  function maybePromote() {
    if (hasEngagement) {
      showCard();
    } else if (visitCount >= 2) {
      showCard(1200);
    }
  }

  function dismissPromotion() {
    writeStorage(localStorage, DISMISS_KEY, String(Date.now()));
    writeStorage(sessionStorage, SESSION_KEY, '1');
    hideCard();
  }

  function openIosInstructions() {
    writeStorage(sessionStorage, SESSION_KEY, '1');
    hideCard();

    if (iosDialog?.showModal) {
      iosDialog.showModal();
    }
  }

  async function promptForInstall() {
    if (!deferredPrompt) return;

    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    hideCard();

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === 'dismissed') {
      writeStorage(localStorage, DISMISS_KEY, String(Date.now()));
    }

    console.log('PWA install choice:', choice.outcome);
  }

  const visitCount = getVisitCount();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    maybePromote();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    writeStorage(sessionStorage, SESSION_KEY, '1');
    hideCard();
    console.log('PWA installed');
  });

  dismissButton.addEventListener('click', dismissPromotion);
  actionButton.addEventListener('click', () => {
    if (isIosDevice()) {
      openIosInstructions();
    } else {
      promptForInstall().catch((error) => {
        console.error('PWA install prompt failed:', error);
      });
    }
  });

  iosCloseButton?.addEventListener('click', () => iosDialog?.close());
  iosDoneButton?.addEventListener('click', () => {
    writeStorage(localStorage, DISMISS_KEY, String(Date.now()));
    iosDialog?.close();
  });

  window.PWAInstall = {
    showAfterEngagement() {
      hasEngagement = true;
      maybePromote();
    }
  };

  if (isStandalone()) {
    hideCard();
  } else if (isIosDevice()) {
    maybePromote();
  }
})();
