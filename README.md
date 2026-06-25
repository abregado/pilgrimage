# Pilgrim

A multiplayer pilgrimage game. Players carry Ideals between Beacons, pray at Altars, and pass strangers on the road.

See `plan-full.md` for a full description of the game.

---

## Requirements

- [Node.js](https://nodejs.org) v15 or later

---

## Setup

```
npm install
```

---

## Starting the Server

```
npm start
```

The server starts on port 3000. Open `http://localhost:3000` in a browser to play.

Other players on the same local network can connect by entering your machine's local IP address instead of `localhost`, e.g. `http://192.168.1.42:3000`.

---

## Connecting the Client

When the app loads you will be asked for a server address. Enter the address of the machine running the server:

- **Same machine:** `localhost:3000`
- **Local network:** `192.168.1.x:3000` (replace with your machine's IP)

The address is saved and used automatically on future visits. You can change it from the **Pilgrim** tab at any time.

---

## Game State

Game state is stored in `server/data/state.json` and is updated automatically as the game runs. Restarting the server resumes from where it left off.

To reset the world to its starting state, delete `server/data/state.json` and restart the server.

---

## Deploying the Client as a PWA

The client folder can be deployed to any static host (e.g. GitHub Pages). Players install it as a PWA from their browser.

> **Note:** A browser will block connections from an HTTPS page to a plain `ws://` server. To avoid this, have players open the game directly from the server address (`http://[your-ip]:3000`) rather than from the hosted PWA. The server serves the client files itself. The hosted version is best suited for when the server is running behind a proper HTTPS/WSS setup.

---

## Changing the Port

```
PORT=8080 npm start
```
