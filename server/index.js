const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const { loadState, saveState } = require('./persistence');
const { createSeed } = require('./seed');
const {
  init,
  getState,
  registerClient,
  unregisterClient,
  queueAction,
  createPilgrim,
  sendState,
} = require('./gameLoop');
const { findPilgrimByUUID } = require('./state');

const PORT = process.env.PORT || 3001;
const CLIENT_DIR = path.join(__dirname, '..', 'client');

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(CLIENT_DIR, urlPath);

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(CLIENT_DIR, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); return res.end('Not found'); }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(d2);
        });
      } else {
        res.writeHead(500);
        res.end();
      }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let hardwareUUID = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const state = getState();

    if (msg.type === 'JOIN') {
      hardwareUUID = String(msg.hardwareUUID).slice(0, 64);
      let pilgrim = findPilgrimByUUID(state, hardwareUUID);
      if (!pilgrim) {
        pilgrim = createPilgrim(hardwareUUID);
      }
      registerClient(hardwareUUID, ws);
      ws.send(JSON.stringify({ type: 'JOINED', pilgrimId: pilgrim.id }));
      sendState(ws, pilgrim);
      return;
    }

    if (!hardwareUUID) return;
    const pilgrim = findPilgrimByUUID(state, hardwareUUID);
    if (!pilgrim) return;

    if (msg.type === 'REQUEST_UPDATE') {
      sendState(ws, pilgrim);
      return;
    }

    if (msg.type === 'ACTION' && msg.action) {
      queueAction(pilgrim.id, msg.action, (result) => {
        if (!result.success) {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'ERROR', code: result.error, message: result.error }));
          }
        }
      });
    }
  });

  ws.on('close', () => {
    if (hardwareUUID) unregisterClient(hardwareUUID);
  });

  ws.on('error', () => {
    if (hardwareUUID) unregisterClient(hardwareUUID);
  });
});

let initialState = loadState();
if (!initialState) {
  initialState = createSeed();
  saveState(initialState);
  console.log('Created new game world from seed.');
}

init(initialState);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pilgrim server → http://localhost:${PORT}`);
});
