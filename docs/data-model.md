# Data Model

All shapes are plain JSON objects. The server's authoritative state lives in `_state` inside `server/state.js`.

---

## Server State (`_state`)

```js
{
  version: 17,         // integer; migration key
  tick: number,        // monotonically increasing, 1 per second
  gardeners: {         // keyed by deviceId (UUID string)
    [deviceId]: Gardener
  },
  locations: {         // keyed by locationId
    [locationId]: LocationData
  }
}
```

---

## Gardener (server-side, full)

```js
{
  id: string,               // 4-byte hex public id, shown to other players
  state: 'resting' | 'walking' | 'arriving' | 'sleeping',
  locationId: string|null,  // null while walking
  pathId: string|null,
  pathFrom: string|null,    // which end of the path they started from
  progress: number,         // meters walked along current path
  seed: string|null,        // currently carried seedId
  encounteredThisTrip: [{id, seed}],
  arrivedEncounters: [{id, seed}]|null,
  createdTick: number,
  lastActiveTick: number,
  energy: number,
  energyMax: number,        // computed; stored for caching
  speedBonus: number,       // multiplier, starts 1.0; ×1.02 per completed rule
  rules: Rule[],
  ruleSlots: number,        // always 4
  availableSeeds: string[]|null,  // populated on walk, cleared on continue
  locationMemory: {         // keyed by locationId
    [locId]: [{id: string, seedId: string|null, lastPlantedTick: number|null}]  // pot snapshot from last departure; lastPlantedTick lets the client forward-simulate growth stage locally
  },
  travelQueue: string[],    // remaining pathIds after the current leg (queue_travel / dendriport_queue)
  record: {
    wanderings: string[],   // locationId log (includes repeats)
    seedLog: {              // keyed by seedId
      [seedId]: { seed: bool, seedling: bool, grown: bool, fruiting: bool, dead: bool }
    },
    decoratedPots: string[] // potIds where gardener has an active decoration
  }
}
```

### energyMax milestones (computed in `computeEnergyMax`)

- Base: 8
- +1 after 1 day (`age >= 86400` ticks)
- +1 after 1 week (`age >= 604800` ticks)
- +1 if all 15 locations visited
- +1 per completed, non-deleted vision rule

See `docs/constants.md` and `docs/energy.md` for the underlying constants.

---

## Rule (server-side, within gardener.rules)

```js
{
  id: string,           // 4-byte hex instance id
  templateId: string,   // references RULE_TEMPLATE_MAP key
  level: 1|2|3,
  difficulty: number,   // target satisfiedCount
  description: string,
  completed: boolean,
  safeUntil: number|null,  // tick until which the rule won't be re-evaluated
  deletedTick: number|null,  // non-null means refreshing
  refreshAt: number|null     // tick when slot is replaced
}
```

### safeUntil behaviour

When a rule is first completed: `safeUntil = tick + RULE_SAFE_TIME` (24 h).  
When the last active rule completes: all active rules get `safeUntil = tick + RULE_SAFE_TIME * 3` (72 h).  
After `safeUntil` passes, the rule is re-evaluated each tick. If conditions are still met, `safeUntil` renews. If not, the rule becomes incomplete and `speedBonus` is reduced.

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
    seed, createdTick, lastActiveTick,
    energy, energyMax, energyRegenAt,  // energyRegenAt: tick of next regen (null if full)
    speedBonus,
    rules: RuleView[],
    availableSeeds: string[]|null,
    locationMemory: { [locId]: [{id, seedId, lastPlantedTick}] },
    travelQueue: string[],       // remaining pathIds after the current leg
    lastProcessedSeq: number,    // highest client action `seq` the server has processed (added by broadcast(), not getGardenerView() — see ws-protocol.md)
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
  rulesSpeedBonus: number   // total fractional bonus from rules + full-vision bonus
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

seedPool = origin seed + carried seed + grown/fruiting pots + seeds carried by other resting gardeners here.

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
  seeds: string[],   // seedIds involved (drawn as icons on the vision card)
  completed, safeUntil,
  satisfiedCount, satisfiedHere,
  refreshing: false, refreshAt: null }

// Refreshing slot:
{ id, refreshing: true, refreshAt: number }
```

`satisfiedCount` = number of the gardener's unique visited locations where the rule's check passes.  
`satisfiedHere` = whether it passes at the current location.  
`safeUntil` = tick until which the completed rule is protected (null if not in safe period).
