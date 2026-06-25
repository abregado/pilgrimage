# Pilgrim — Game Design Document

## Overview

Pilgrim is an asynchronous multiplayer browser game about the slow movement of ideas through a world of sacred places. Players take on the role of a Pilgrim — an anonymous wanderer who travels between Beacons, carries an Ideal, and leaves their mark on Altars. There is no combat, no score, and no winner. The game is about collective belief and the quiet influence of passing strangers.

---

## The World

The world consists of four **Beacons** — named locations of spiritual significance — connected by a network of **Paths** of varying lengths. Every Beacon contains three **Altars**, each holding an Ideal. Every Beacon also has three permanent **Core Ideals** that define its character, available for any Pilgrim to collect.

The world is fully persistent. The simulation runs continuously on the server whether anyone is playing or not.

---

## Ideals

There are twelve Ideals in the game, each representing a philosophical virtue: Wisdom, Courage, Justice, Temperance, Compassion, Humility, Truth, Honor, Perseverance, Serenity, Gratitude, and Fortitude. Each has a name, a colour, and a placeholder image that can be replaced with custom artwork.

A Pilgrim can carry at most one Ideal at a time. Ideals move through the world as Pilgrims carry them, place them on Altars, and trade them with strangers on the road.

---

## Pilgrims

A Pilgrim is created automatically the first time a player opens the app and connects to a server. It spawns at a random Beacon. Pilgrims are anonymous — they have no names and no way to communicate with each other. They are distinguished only by the Ideal they carry.

A Pilgrim is always in one of four states:

- **Waiting** — at a Beacon, recently active.
- **Praying** — at a Beacon, locked into a brief period of reflection after changing an Altar. Cannot move or take other actions until this ends.
- **Travelling** — on a Path, moving toward the Beacon at the other end.
- **Sleeping** — has not been active for six hours. Wakes automatically on next action.

---

## Beacons

When a Pilgrim arrives at a Beacon they can do several things:

**Pray at an Altar.** Praying at an Altar makes the Pilgrim a Believer of that Altar's Ideal, and removes their allegiance from any other Altar at this Beacon. The Altar with the most Believers at a Beacon is the **Strongest Altar** — it cannot be changed by anyone.

**Change an Altar.** A Pilgrim can place the Ideal they are carrying into any Altar that is not the Strongest and is not currently under protection. When they do, the Altar's previous Believers list is wiped, and the Pilgrim enters a brief Praying period during which they cannot act. After changing an Altar, the Ideal it held is replaced and the Pilgrim no longer carries anything.

**Take a Core Ideal.** Each Beacon has three Core Ideals that are permanently available. A Pilgrim can take one, replacing whatever they were carrying. An undo button appears immediately after, in case the tap was accidental. The undo option disappears if the Pilgrim changes an Altar or begins to travel.

**Travel a Path.** A Pilgrim can begin walking any Path that connects to this Beacon. They cannot travel while Praying.

---

## Paths

Paths vary in length. A Pilgrim moves at a fixed speed, so longer Paths take proportionally more time to walk. While on a Path:

- The Pilgrim's position is tracked precisely, so the game always knows who has passed whom.
- When two Pilgrims travelling in opposite directions cross each other, they are added to each other's list of **Encountered Pilgrims**.
- A Pilgrim can choose to take the Ideal carried by any Pilgrim they have encountered, replacing their own. The other Pilgrim is unaffected — their Ideal is not taken from them, only copied.
- A Pilgrim can reverse direction at any time.

---

## Arriving

When a Pilgrim reaches the end of a Path, they are placed at the destination Beacon — but before the Beacon screen appears, an **Arrival screen** is shown. This is a final moment to review everyone they passed on the journey and optionally take one of their Ideals before stepping into the Beacon proper. Once the player taps Continue, the Arrival screen is dismissed and the Beacon comes into view.

---

## The Pilgrim Record

Each Pilgrim accumulates a personal history over time:

- **Passport** — every Beacon they have visited, in order.
- **Seen Ideals** — every Ideal they have encountered, whether on an Altar, carried by another Pilgrim, or offered as a Core Ideal.
- **Belief Structure** — the top three Ideals from Altars where the Pilgrim is a current Believer, weighted by how many other Believers share those Altars.
- **Age** — how long the Pilgrim has existed.

---

## Protection and Conflict

Altars are not entirely defenceless. After an Altar is changed, it enters a **protection period** during which no one can change it again. This gives new Believers time to form before it can be overwritten. The protection period is twice as long as the Praying period that follows an Altar change.

The Strongest Altar — the one with the most Believers at a given Beacon — can never be changed. This means that once enough Pilgrims commit to an Ideal at a location, it becomes entrenched. Changing the balance requires either drawing Believers away or working on the Altars that are not yet dominant.

---

## The Map

A third tab shows a growing map of the world as the Pilgrim explores it. Beacons the Pilgrim has visited appear clearly. Beacons adjacent to visited ones — reachable via a single Path — appear dimly. Beacons with no connection to anywhere the Pilgrim has been remain invisible. The Pilgrim's current position is shown on the map. The map cannot be used for navigation; it is purely a record of where you have been.

---

## Technical Design

### Architecture

The game is divided into a server and a client. All simulation happens on the server. The client is a display layer.

The **server** runs on Node.js and uses WebSockets to communicate with clients. It runs a continuous simulation — advancing Pilgrims along Paths, detecting when they cross each other, detecting arrivals, and managing Altar timers — one tick per second. Game state is written to disk after every tick in which something changes, so no progress is lost if the server restarts.

The **client** is a plain HTML, CSS, and JavaScript web application with no dependencies or build step. It can be installed as a PWA (Progressive Web App) from a browser. The client stores a device identifier in local storage and uses it to reconnect to the same Pilgrim across sessions.

### Keeping Traffic Low

The client does not poll the server constantly. After any action, it polls frequently for a short window to catch fast-changing state, then drops to infrequent background polling. Countdowns and progress bars on screen are driven by the client's local clock, extrapolating from the last server tick — they update every frame without any network calls. The client also tracks the expected time of future events (arrival, prayer expiry, Altar protection ending) and sends a single update request at those moments.

### Connecting

On first launch the player is asked to enter the server's address. On subsequent visits the address is recalled from local storage and the client reconnects automatically. The server address can be changed at any time from the Pilgrim information screen.

Because the server communicates over plain WebSockets, the client must be loaded over HTTP (not HTTPS) to connect to a local server. The server itself also serves the client files, so players on the same local network can open the game directly from the server's address without any mixed-content restriction.

---

## Beacons and Paths (Starting World)

| Beacon | Core Ideals |
|--------|-------------|
| The Citadel | Wisdom, Justice, Honor |
| The Grove | Compassion, Humility, Gratitude |
| The Forge | Courage, Perseverance, Fortitude |
| The Spring | Truth, Temperance, Serenity |

| Path | Distance |
|------|----------|
| The Citadel ↔ The Grove | 1,500 m |
| The Citadel ↔ The Forge | 3,000 m |
| The Citadel ↔ The Spring | 2,500 m |
| The Grove ↔ The Forge | 2,000 m |
| The Grove ↔ The Spring | 4,000 m |
| The Forge ↔ The Spring | 1,000 m |
