# Vision / Rules System (`server/rules.js`)

---

## Concepts

- Each gardener holds 4 **rule slots** (always 4; `ruleSlots` field unused beyond this).
- Each slot contains a **rule instance** referencing a **template**.
- A rule is satisfied at a location when `template.check(pots)` returns true.
- A rule is **completed** when `satisfiedCount >= difficulty` (checked every tick against unique visited locations).
- Completing a rule multiplies `speedBonus × 1.02`.
- A completed rule can be **deleted** (refreshed): slot cools for 60 ticks, then gets a new rule of the same level. Deleting a completed rule divides `speedBonus / 1.02`.

---

## Template structure

```js
{
  id: string,         // unique string key
  level: 1|2|3,
  difficulty: number, // target satisfied location count
  description: string,
  seeds: string[],    // seedIds involved (used for biased initial assignment)
  check: (pots) => boolean
}
```

---

## Rule levels and types

### Level 1 — Single-seed presence (difficulty 6)

`{seedId}_present`

`check`: any pot has `seedId`.

15 templates (one per seed).

---

### Level 2a — Co-presence pair (difficulty 6)

`{a}_{b}_copresent`

`check`: at least one pot has `a` AND at least one has `b`.

15 templates (one per adjacent pair).

---

### Level 2b — Adjacent pair (difficulty 3)

`{a}_{b}_adjacent`

`check`: two consecutive pots (wrapping) hold `a` and `b` in either order.

15 templates.

---

### Level 2c — Next to empty (difficulty 8)

`{seedId}_next_empty`

`check`: a pot with `seedId` has at least one empty neighbour (prev or next, wrapping).

15 templates.

---

### Level 3a — Sandwich (difficulty 3)

`{b}_sandwiches_{a}` — check: both neighbours of some `a` pot are `b`.  
`{a}_sandwiches_{b}` — check: both neighbours of some `b` pot are `a`.

30 templates (2 per pair).

---

### Level 3b — Triple planting (difficulty 6)

`{seedId}_triple`

`check`: seed appears in 3 or more pots.

15 templates.

---

## Initial rule assignment (`pickInitialRules(originSeedId)`)

Picks 4 rules biased toward the gardener's origin seed:

1. L1 matching origin seed
2. L1 any (avoids already-picked)
3. L2 matching origin seed
4. L3 matching origin seed

Falls back to any unused template at the required level if no seed-matching one is available.

---

## Refresh (`pickNewRuleForLevel(level, existingRules)`)

Picks a random unused template at the given level (avoiding all templates currently in the gardener's slots, including refreshing slots).

---

## Pot arrangement

Pots are stored as an ordered array. Rules treat them as a **ring** (index `i+1` wraps back to 0). The "adjacent" and "sandwich" checks rely on this ring structure, so pot order matters. Pot order is fixed at location creation and never changes.
