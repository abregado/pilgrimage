window.Pilgrim = window.Pilgrim || {};

Pilgrim.Main = (() => {
  let _hardwareUUID = null;

  function getHardwareUUID() {
    if (_hardwareUUID) return _hardwareUUID;
    let uuid = localStorage.getItem('pilgrim_uuid');
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem('pilgrim_uuid', uuid);
    }
    _hardwareUUID = uuid;
    return uuid;
  }

  async function autoConnect() {
    const url = localStorage.getItem('pilgrim_server_url') ||
      (window.location.protocol !== 'file:' ? window.location.host : null);
    if (!url) return;
    Pilgrim.State.set({ serverUrl: url });
    try {
      await Pilgrim.Network.connect(url, getHardwareUUID());
      localStorage.setItem('pilgrim_server_url', url);
    } catch {
      // Stay on connect screen; user can hit Retry
    }
  }

  async function init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Pilgrim.State.set({ activeTab: btn.dataset.tab });
      });
    });

    Pilgrim.Screens.Connect.init();
    Pilgrim.Render.start();
    await autoConnect();
  }

  return { init, getHardwareUUID, autoConnect };
})();

document.addEventListener('DOMContentLoaded', () => Pilgrim.Main.init());
