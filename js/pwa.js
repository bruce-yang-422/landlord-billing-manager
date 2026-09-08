// 離線準備與更新狀態；更新不會強制重新載入正在編輯的帳單。
(function () {
  'use strict';

  const status = document.getElementById('pwaStatus');
  if (!status) return;

  if (!window.isSecureContext || !/^https?:$/.test(location.protocol)) {
    status.textContent = '安裝與離線功能需使用 HTTPS 或 localhost 開啟。';
    return;
  }
  if (!('serviceWorker' in navigator)) {
    status.textContent = '此瀏覽器不支援離線功能。';
    return;
  }

  let ready = false;
  let updateAvailable = false;
  let failed = false;

  function render() {
    status.textContent = ready
      ? (navigator.onLine ? '已可離線使用' : '目前離線，可繼續記帳')
      : (failed ? '離線準備未完成，請連線後重新開啟。' : '正在準備離線功能…');
    if (updateAvailable) {
      status.textContent += ' · 新版已備妥，請儲存帳單並關閉所有本工具視窗，再重新開啟以更新。';
    }
  }

  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  render();

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js', {
        updateViaCache: 'none'
      });

      function checkRegistration() {
        ready = registration.active?.state === 'activated';
        updateAvailable = Boolean(registration.waiting && registration.active);
        render();
      }

      function watchInstalling() {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'redundant') failed = true;
          checkRegistration();
        });
        checkRegistration();
      }

      registration.addEventListener('updatefound', watchInstalling);
      watchInstalling();
      navigator.serviceWorker.addEventListener('controllerchange', checkRegistration);
      navigator.serviceWorker.ready.then(checkRegistration);

      // 回到長時間開啟的 App 時也檢查新版。
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          registration.update().catch((error) => console.warn('PWA update check failed:', error));
        }
      });
    } catch (error) {
      failed = true;
      render();
      console.error('Service Worker registration failed:', error);
    }
  });
})();
