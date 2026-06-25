window.Pilgrim = window.Pilgrim || {};
Pilgrim.Screens = Pilgrim.Screens || {};

Pilgrim.Screens.Connect = (() => {
  function render() {
    const saved = localStorage.getItem('pilgrim_server_url') || '';
    document.getElementById('server-url-input').value = saved;
    document.getElementById('connect-error').textContent = '';
  }

  function showError(msg) {
    document.getElementById('connect-error').textContent = msg;
  }

  function init() {
    document.getElementById('join-btn').addEventListener('click', attemptJoin);
    document.getElementById('server-url-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptJoin();
    });
  }

  async function attemptJoin() {
    const input = document.getElementById('server-url-input');
    const url = input.value.trim();
    if (!url) { showError('Enter a server address.'); return; }

    const btn = document.getElementById('join-btn');
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    document.getElementById('connect-error').textContent = '';

    const uuid = Pilgrim.Main.getHardwareUUID();

    try {
      await Pilgrim.Network.connect(url, uuid);
      localStorage.setItem('pilgrim_server_url', url);
      Pilgrim.State.set({ serverUrl: url });
    } catch (e) {
      showError('Could not connect. Check the address and try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Join';
    }
  }

  return { render, init };
})();
