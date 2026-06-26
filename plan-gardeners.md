# Verdant — Game Design Document

## Overview

Verdant is an asynchronous multiplayer browser game about the slow spread of rare plants through a world of tended places. Players take on the role of a Pilgrim — an anonymous wanderer who travels between Locations, carries a Seed, and tends to Pots. There is no combat, no score, and no winner. The game is about collective cultivation and the quiet influence of passing strangers.

---

## The World

The world consists of fifteen **Locations** — named places where plants are grown and tended — connected by a network of **Paths** of varying lengths. Every Location contains between six and nine **Pots**, with each Location having its own fixed count. One Pot holds the location's **Origin Seed** from the start; the remainder begin **Empty**. The Origin Seed defines the character of its Location and is always present.

The world is fully persistent. The simulation runs continuously on the server whether anyone is playing or not.

---

## Seeds

There are fifteen Seeds in the game, each a rare and fictional plant with its own character:

| Seed | Description |
|------|-------------|
| **Velour Bloom** | A low-growing flower with petals the colour of deep bruise, soft as cloth to the touch. It opens fully only once a season. |
| **Cinder Fern** | A fern with ash-grey fronds that curl tightly in cold air and fan out in warmth. It grows back quickly after fire. |
| **Mirewort** | A broad-leafed swamp plant with roots that extend far below the waterline. It is among the oldest plants in any bog it inhabits. |
| **Stonecress** | A compact plant that grows in rock fissures, producing clusters of small white flowers. It is nearly impossible to uproot once established. |
| **Ember Weed** | A low, creeping plant with deep red leaves that seem to hold light after sunset. It grows best in poor soil. |
| **Wanderbloom** | A trailing flower that reorients its face toward any consistent source of warmth. Cuttings taken from it retain this behaviour. |
| **Goldthread** | A vine with impossibly thin golden tendrils that reach aggressively toward sunlight. It can climb several centimetres in a single day. |
| **Salthorn** | A coastal succulent with stiff ivory spines and small yellow flowers. It can survive long periods without water or soil. |
| **Rainfall Lily** | A tall, slender lily that grows perfectly straight even in heavy wind. It blooms only during or just after rain. |
| **Quietbranch** | A slow-growing shrub with dark bark and silver-green leaves that barely stir in a breeze. It is said to muffle the sounds of plants growing near it. |
| **Thornwhisper** | A climbing vine covered in glass-clear thorns that scatter light into small rainbows. It makes almost no sound in wind, unlike most climbers. |
| **Glassroot** | A plant whose stem and roots are semi-translucent, making the movement of water through it visible to the naked eye. |
| **Ironmoss** | A dense, rigid moss that forms geometric patterns on rock and bark. Individual patches can live for centuries undisturbed. |
| **Duskbell** | A bell-shaped flower that closes during the day and opens at dusk, releasing a faint scent of wet earth. |
| **Murmuring Sage** | A silver-grey herb whose leaves tremble faintly even in still air. Used historically in ceremonies involving long silences. |

Each Seed has a name, a colour, and an icon. Seed artwork is located in `./assets/` as both PNG and SVG files.

A Pilgrim can carry at most one Seed at a time. Seeds move through the world as Pilgrims carry them, plant them in Pots, and exchange them with others at Locations.

---

## Growth Stages

Each Pot records a timestamp of when its Seed was last planted. Based on how long a Seed has been growing, the Pot's visual representation progresses through stages:

| Stage | Trigger | Description |
|-------|---------|-------------|
| **Seed** | Just planted | The seed sits in bare soil. |
| **Seedling** | After `SEEDLING_TICKS` | A small shoot has emerged. |
| **Grown** | After `GROWN_TICKS` | The plant has reached full height. |
| **Fruiting** | After `FRUITING_TICKS` | The plant is flowering or bearing fruit. |
| **Dead** | After `DEAD_TICKS` | The plant has died. |

All fifteen Seeds require PNG artwork for each of the five growth stages. Each stage also has its own descriptive text per plant.

---

## Pilgrims

A Pilgrim is created automatically the first time a player opens the game in a browser. It spawns at a random Location. Pilgrims are anonymous — they have no names and no way to communicate with each other. They are distinguished only by the Seed they carry.

A Pilgrim is always in one of four states:

- **Resting** — at a Location, recently active.
- **Tending** — at a Location, in a brief cooldown after Planting. Cannot move or take other actions until `TENDING_DURATION` (1 second) has elapsed.
- **Walking** — on a Path, moving toward the Location at the other end.
- **Sleeping** — has not been active for six hours. Wakes automatically on next action.

### Energy

Pilgrims have a pool of **Energy** used to perform Planting actions. A Pilgrim's maximum Energy grows as they reach milestones:

| Condition | Energy Max |
|-----------|-----------|
| New Pilgrim | 3 |
| Pilgrim > 1 day old | +1 |
| Pilgrim > 1 week old | +1 |
| Visited all Locations | +1 |
| Each completed Vision Rule | +1 |

Energy milestones are shown on the Pilgrim Record. A Pilgrim with no Energy cannot perform a Planting action. Decorating and Travelling do not cost Energy.

---

## Locations

When a Pilgrim arrives at a Location they can do several things:

**Decorate a Pot.** A Pilgrim can place an **Amulet** on any Pot that currently holds a Seed. Pilgrims have an unlimited supply of Amulets. Internally, a Pot's decoration list is stored as a list of Pilgrim IDs who have decorated it; other Pilgrims only see the count, not whose Amulets are there. A Pilgrim may Decorate any number of Pots at a Location. Decorating does not cost Energy.

**Plant a Seed.** A Pilgrim can plant any Seed from the Location's **Nursery** into any Pot that is not currently in its settling period. This costs 1 Energy. After Planting, the Pilgrim enters the **Tending** state for `TENDING_DURATION` (1 second). Planting does not remove or alter the Pilgrim's carried Seed.

**Swap a Seed.** A Pilgrim can exchange their carried Seed for any Seed type currently in the Location's Nursery. This does not cost Energy.

**Walk a Path.** A Pilgrim can begin walking any Path that connects to this Location. They cannot walk while Tending. Walking does not cost Energy.

### The Nursery

Each Location has a **Nursery** — a pool of Seed types currently available there. The Nursery contains:

- The Origin Seed of the Location (always present)
- All Seed types currently in Pots at the Location
- All Seed types currently carried by Pilgrims present at the Location

The Nursery is the source for both Planting and Swapping. It reflects the current state of the Location in real time.

### Pilgrims Present

A widget at the Location shows all other Pilgrims currently present. Each Pilgrim is represented as a **meeple** shape. The colour of the meeple indicates the Pilgrim's current state (Resting, Tending, Walking, Sleeping).

---

## Paths

Paths vary in length. A Pilgrim moves at a fixed base speed (modified by Vision Rule bonuses), so longer Paths take proportionally more time to walk. While on a Path:

- The Pilgrim's position is tracked precisely, so the game always knows who has passed whom.
- When two Pilgrims travelling in opposite directions cross each other, they are added to each other's list of **Encountered Pilgrims**.
- A Pilgrim can choose to take the Seed carried by any Pilgrim they have encountered, replacing their own. The other Pilgrim is unaffected — their Seed is not taken from them, only copied.
- A Pilgrim can reverse direction at any time.

---

## Arriving

When a Pilgrim reaches the end of a Path, they are placed at the destination Location — but before the Location screen appears, an **Arrival screen** is shown. This is a final moment to review everyone they passed on the journey and optionally take one of their Seeds before stepping into the Location proper. Once the player taps Continue, the Arrival screen is dismissed and the Location comes into view.

---

## The Pilgrim's Record

Each Pilgrim accumulates a personal history over time:

- **Wanderings** — every Location they have visited, in order.
- **Seed Log** — a record of all fifteen Seeds, each tracked across three discoveries:
  - *Seed* — the Pilgrim has carried this Seed, or passed another Pilgrim carrying it on a Path.
  - *Plant* — the Pilgrim has seen this Seed growing in a Pot at a Location.
  - *Origin* — the Pilgrim has visited the home Location and seen this Seed in its Origin Seed Pot.
- **Garden** — the top three Seeds from Pots where the Pilgrim has placed an Amulet, weighted by how many other Pilgrims have also placed Amulets on those Pots.
- **Energy** — current Energy, maximum Energy, and which milestones have been reached.
- **Vision** — the Pilgrim's current Vision and Rules (see below).
- **Age** — how long the Pilgrim has existed.

---

## Settling Period

After a Pot is Planted into, it enters a **settling period** during which no one can Plant into it again. This gives newly planted Seeds time to establish before they can be overwritten. The settling period is defined by `SETTLING_TICKS`.

An Empty Pot is never in its settling period. It is always available to receive a Seed.

---

## Vision and Rules

Each Pilgrim has a **Vision** — a personal set of **Rules** describing arrangements of Seeds they are working toward. Vision and Rules are shown both in the Pilgrim Record and as a widget in the Location tab.

### Rules

A Rule describes a desired arrangement of Seeds across a Location's Pots. Examples:
- "Have one Mirewort next to a Goldthread"
- "Three Thornwhisper in total"

Rules may include empty spaces as part of their arrangement. Each Rule has a **difficulty** (set manually in code to allow balance passes) that determines how many Locations must satisfy the Rule before it is considered complete — between 1 and 3 Locations.

### Rule Slots

When a Pilgrim is created, their Vision has **two Rule slots**. Additional slots are unlocked by completing Rules:

- Each completed Rule grants one additional Rule slot.
- A newly granted slot takes `RULE_REFRESH_TIME` (60 seconds) to be filled with a new random Rule.

A Pilgrim may delete a Rule from any slot. The deleted slot begins a `RULE_REFRESH_TIME` countdown before a new random Rule arrives.

### Completing Rules

A Rule is **met at a Location** when the arrangement of Seeds in that Location's Pots matches it. In the Pilgrim Record, each Rule shows how many of the Pilgrim's visited Locations currently satisfy it.

A Rule is **complete** when it is met at the required number of Locations (as set by its difficulty).

### Rewards for Completed Rules

Each completed Rule grants:

- **+1 Energy max**
- **+2% movement speed**

### Vision in the Location Tab

A widget beneath the Pot display shows the Pilgrim's Rules. Any Rule currently met at this Location is highlighted.

### Vision in the Pilgrim Record

Each Rule shows:
- The Rule description
- How many of the Pilgrim's visited Locations currently satisfy it
- A delete button (triggers the `RULE_REFRESH_TIME` countdown for a replacement)

---

## The Map

A tab shows a growing map of the world as the Pilgrim explores it. Location names use larger text for readability.

By default, only the **current Location's** name is shown. When the player hovers over any other Location:

- If the Location has been **visited**: the name is shown, and the symbol for its Origin Seed is displayed on its map point.
- If the Location has **not been visited**: a question mark icon is shown.

Locations the Pilgrim has visited appear clearly. Locations adjacent to visited ones appear dimly. Locations with no connection to anywhere the Pilgrim has been remain invisible. The Pilgrim's current position is shown on the map.

**Clicking a Location** that is directly reachable from the Pilgrim's current Location immediately begins walking that Path.

---

## Technical Design

### Architecture

Verdant is a single Node.js application. The server handles all simulation logic and also serves the HTML, CSS, and JavaScript front end directly to the browser. There is no separate client build and no PWA installation step — players simply open the server's URL in a browser.

The **server** runs on Node.js and uses WebSockets to communicate with clients in real time. It runs a continuous simulation — advancing Pilgrims along Paths, detecting when they cross each other, detecting arrivals, and managing Pot timers — one tick per second. Game state is written to disk after every tick in which something changes, so no progress is lost if the server restarts.

The **front end** is plain HTML, CSS, and JavaScript served by the Node process under a static route. No bundler or build step is required. The browser stores a device identifier in local storage and uses it to reconnect to the same Pilgrim across sessions.

### Assets

Seed icons live in `./assets/` and are served as static files by the Node server. Both PNG and SVG versions are available for all fifteen Seeds. Each Seed also requires PNG artwork for each of the five growth stages (Seed, Seedling, Grown, Fruiting, Dead). App icons (`icon-192.svg`, `icon-512.svg`) are also in the same directory.

### Keeping Traffic Low

The client does not poll the server constantly. After any action, it polls frequently for a short window to catch fast-changing state, then drops to infrequent background polling. Countdowns and progress bars on screen are driven by the client's local clock, extrapolating from the last server tick — they update every frame without any network calls. The client also tracks the expected time of future events (arrival, Tending expiry, Pot settling period ending, Rule refresh) and sends a single update request at those moments.

### Connecting

Because the Node server serves the front end itself, players connect by navigating to the server's address in any browser — no configuration or app installation required. The WebSocket connection is opened to the same host the page was loaded from, so there are no mixed-content issues and no address to enter manually.

---

## Locations and Paths (Starting World)

Each Location begins with one Pot holding the Origin Seed and between six and nine total Pots (exact count per Location to be specified). All remaining Pots begin Empty.

| Location | Origin Seed | Pots |
|----------|-------------|------|
| The Glasshouse | Velour Bloom | — |
| The Fernery | Cinder Fern | — |
| The Bogwood | Mirewort | — |
| The Terrace | Stonecress | — |
| The Coldhouse | Ember Weed | — |
| The Nursery | Wanderbloom | — |
| The Orchard | Goldthread | — |
| The Salt Flats | Salthorn | — |
| The Cutting Garden | Rainfall Lily | — |
| The Walled Garden | Quietbranch | — |
| The Thicket | Thornwhisper | — |
| The Undercroft | Glassroot | — |
| The Canopy | Ironmoss | — |
| The Still Pool | Duskbell | — |
| The Seedbank | Murmuring Sage | — |

| Path | Distance |
|------|----------|
| The Glasshouse ↔ The Fernery | 1,500 m |
| The Glasshouse ↔ The Nursery | 2,000 m |
| The Glasshouse ↔ The Undercroft | 3,000 m |
| The Fernery ↔ The Bogwood | 1,000 m |
| The Fernery ↔ The Canopy | 2,500 m |
| The Bogwood ↔ The Still Pool | 2,000 m |
| The Bogwood ↔ The Thicket | 1,500 m |
| The Canopy ↔ The Thicket | 2,000 m |
| The Canopy ↔ The Orchard | 3,500 m |
| The Thicket ↔ The Walled Garden | 2,500 m |
| The Walled Garden ↔ The Cutting Garden | 1,500 m |
| The Walled Garden ↔ The Seedbank | 2,000 m |
| The Cutting Garden ↔ The Salt Flats | 3,000 m |
| The Salt Flats ↔ The Terrace | 1,000 m |
| The Terrace ↔ The Coldhouse | 2,500 m |
| The Coldhouse ↔ The Seedbank | 1,500 m |
| The Seedbank ↔ The Nursery | 2,000 m |
| The Nursery ↔ The Still Pool | 3,500 m |
| The Still Pool ↔ The Orchard | 2,000 m |
| The Orchard ↔ The Salt Flats | 4,000 m |
| The Undercroft ↔ The Coldhouse | 2,500 m |
