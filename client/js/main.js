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

  async function init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Wire up tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Pilgrim.State.set({ activeTab: btn.dataset.tab });
      });
    });

    Pilgrim.Screens.Connect.init();
    Pilgrim.Render.start();

    // Auto-connect if we have saved credentials
    const savedUrl = localStorage.getItem('pilgrim_server_url');
    if (savedUrl) {
      Pilgrim.State.set({ serverUrl: savedUrl });
      const uuid = getHardwareUUID();
      try {
        await Pilgrim.Network.connect(savedUrl, uuid);
      } catch {
        // Fall through to connect screen
      }
    }
  }

  return { init, getHardwareUUID };
})();

document.addEventListener('DOMContentLoaded', () => Pilgrim.Main.init());
