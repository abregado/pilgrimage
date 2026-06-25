window.Pilgrim = window.Pilgrim || {};

Pilgrim.Network = (() => {
  let _ws = null;
  let _pollTimer = null;
  let _pollCount = 0;
  const FAST_POLL_INTERVAL = 2000;
  const FAST_POLL_COUNT = 30; // 30 × 2s = 60s
  const SLOW_POLL_INTERVAL = 60000;

  function connect(serverUrl, hardwareUUID) {
    if (_ws) { _ws.close(); _ws = null; }

    const url = serverUrl.startsWith('ws') ? serverUrl : `ws://${serverUrl}`;

    return new Promise((resolve, reject) => {
      let settled = false;

      try {
        _ws = new WebSocket(url);
      } catch (e) {
        return reject(e);
      }

      _ws.onopen = () => {
        _ws.send(JSON.stringify({ type: 'JOIN', hardwareUUID }));
      };

      _ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === 'JOINED') {
          Pilgrim.State.set({ pilgrimId: msg.pilgrimId, connected: true });
          if (!settled) { settled = true; resolve(); }
          return;
        }

        if (msg.type === 'STATE') {
          Pilgrim.State.applyServerState(msg.payload);
          return;
        }

        if (msg.type === 'ERROR') {
          console.warn('[pilgrim] server error:', msg.code);
        }
      };

      _ws.onclose = () => {
        Pilgrim.State.set({ connected: false });
        stopPolling();
        if (!settled) { settled = true; reject(new Error('Connection closed')); }
      };

      _ws.onerror = () => {
        if (!settled) { settled = true; reject(new Error('WebSocket error')); }
      };
    });
  }

  function disconnect() {
    stopPolling();
    if (_ws) { _ws.close(); _ws = null; }
  }

  function send(msg) {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(msg));
    }
  }

  function requestUpdate() {
    send({ type: 'REQUEST_UPDATE' });
  }

  function sendAction(action) {
    const tick = Pilgrim.State.estimateTick();
    send({ type: 'ACTION', tickStamp: tick, action });
    startFastPolling();
  }

  function startFastPolling() {
    stopPolling();
    _pollCount = 0;
    _pollTimer = setInterval(() => {
      _pollCount++;
      requestUpdate();
      if (_pollCount >= FAST_POLL_COUNT) {
        stopPolling();
        startSlowPolling();
      }
    }, FAST_POLL_INTERVAL);
  }

  function startSlowPolling() {
    stopPolling();
    _pollTimer = setInterval(requestUpdate, SLOW_POLL_INTERVAL);
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  function isConnected() {
    return _ws && _ws.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, send, sendAction, requestUpdate, isConnected };
})();
