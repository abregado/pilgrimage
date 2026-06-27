# Data Model

All shapes are plain JSON objects. The server's authoritative state lives in `_state` inside `server/state.js`.

---

## Server State (`_state`)

```js
{
  version: 10,          // integer; migration key
  tick: number,         // monotonically increasing, 1 per second
  gardeners: {          // keyed by deviceId (UUID string)
    [deviceId]: Gardener
  },
  locations: {          // keyed by locationId
    [locationId]: LocationData
  }
}
```

---

## Gardener (server-side, full)

```js
{
  id: string,               // 4-byte hex public id, shown to other players
  state: 'resting' | 'tending' | 'walking' | 'arriving' | 'sleeping',
  locationId: string|null,  // null while walking
  pathId: string|null,
  pathFrom: string|null,    // which end of the path they started from
  progress: number,         // meters walked along current path
  seed: string|null,        // currently carried seedId
  tendingUntil: number|null,// tick when tending completes
  encounteredThisTrip: [{id, seed}],
  arrivedEncounters: [{id, seed}]|null,
  createdTick: number,
  lastActiveTick: number,
  energy: number,
  energyMax: number,        // computed; stored for caching
  speedBonus: number,       // multiplier, starts 1.0; +2% per completed vision
  rules: Rule[],
  ruleSlots: number,        // always 4
  availableSeeds: string[]|null,  // populated on walk, cleared on continue
  locationMemory: {         // keyed by locationId
    [locId]: [{id: string, seedId: string|null}]  // pot snapshot from last departure
  },
  record: {
    wanderings: string[],   // locationId log (includes repeats)
    seedLog: {              // keyed by seedId
      [seedId]: { seed: bool, seedling: bool, grown: bool, fruiting: bool, dead: bool }
    },
    decoratedPots: string[] // potIds where gardener has an active decoration
  }
}
```

### energyMax milestones (computed)

- Base: 3
- +1 after 1 day (`age >= 86400` ticks)
- +1 after 1 week (`age >= 604800` ticks)
- +1 if all 15 locations visited
- +1 per completed, non-deleted vision rule

---

## Rule (server-side, within gardener.rules)

```js
{
  id: string,           // 4-byte hex instance id
  templateId: string,   // references RULE_TEMPLATE_MAP key
  level: 1|2|3,
  difficulty: number,   // target satisfiedCount (6, 3, or 8 depending on type)
  description: string,
  completed: boolean,
  deletedTick: number|null,  // non-null means refreshing
  refreshAt: number|null     // tick when slot is replaced
}
```

---

## LocationData (server-side)

```js
{
  pots: Pot[]
}
```

### Pot

```js
{
  id: string,                // "{locId}_pot_{index}"
  seedId: string|null,
  decorators: string[],      // gardener public ids
  settlingUntil: number|null,// tick; pot cannot be replanted until this passes
  lastPlantedTick: number|null
}
```

---

## GardenerView (sent to client via WS)

This is what `getGardenerView(deviceId)` returns and what the client receives as `msg.data`.

```js
{
  gardener: {
    id, state, locationId, pathId, pathFrom, progress,
    seed, tendingUntil, createdTick, lastActiveTick,
    energy, energyMax, speedBonus,
    rules: RuleView[],
    availableSeeds: string[]|null,
    locationMemory: { [locId]: [{id, seedId}] }
  },
  location: LocationView|null,  // null when walking
  path: PathView|null,          // null when not walking
  arrival: ArrivalView|null,    // non-null only when state === 'arriving'
  record: {
    wanderings: string[],
    seedLog: { [seedId]: { seed, seedling, grown, fruiting, dead } },
    garden: [{seedId, otherDecoratorCount}],  // top 3 actively-decorated pots
    ageTicks: number
  },
  tick: number,
  movementSpeed: number,
  rulesSpeedBonus: number   // total fractional bonus from completed rules
}
```

### LocationView

```js
{
  id: string,
  name: string,
  pots: [{
    id, seedId, seedName,
    decoratorCount, iDecorated,
    settlingUntil, lastPlantedTick
  }],
  otherGardeners: [{id, seed, state}],
  seedPool: string[]   // seedIds available to plant here
}
```

seedPool = origin seed + carried seed + grown/fruiting pots + seeds carried by other resting/tending gardeners here.

### PathView

```js
{
  id, length,
  fromId, fromName, toId, toName,
  progress, pathFrom,
  encounters: [{id, seed, state}]
}
```

### ArrivalView

```js
{
  locationId, locationName,
  encounters: [{id, seed, state}]
}
```

### RuleView

```js
// Active rule:
{ id, templateId, level, description, difficulty,
  completed, satisfiedCount, satisfiedHere,
  refreshing: false, refreshAt: null }

// Refreshing slot:
{ id, refreshing: true, refreshAt: number }
```

`satisfiedCount` = number of the gardener's unique visited locations where the rule's check passes.
`satisfiedHere` = whether it passes at the current location.
