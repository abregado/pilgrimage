# Vision / Rules System (`server/rules.js`)

---

## Concepts

- Each gardener holds 4 **rule slots** (always 4; `ruleSlots` field unused beyond this).
- Each slot contains a **rule instance** referencing a **template**.
- A rule is satisfied at a location when `template.check(pots, tick)` returns true.
  - **L1 checks**: any growth stage counts.
  - **L2 checks**: only pots with plant age `>= SEEDLING_TICKS` (30 min) count.
  - **L3 checks**: only pots with plant age `>= GROWN_TICKS` (6 h) count.
- A rule is **completed** when `satisfiedCount >= difficulty` (checked every tick against unique visited locations, unless in safe period).
- Completing a rule:
  - Sets `speedBonus × 1.02`.
  - Sets `safeUntil = tick + RULE_SAFE_TIME` (24 h).
  - If all active rules are now complete: sets `safeUntil = tick + RULE_SAFE_TIME * 3` (72 h) for all.
- A completed rule can be **deleted** (refreshed): slot cools for 60 ticks, then gets a new rule of the same level. Deleting reduces `speedBonus / 1.02`.
- After the safe period, a rule is re-evaluated. If conditions are no longer met, `completed` reverts to false and `speedBonus / 1.02`.

### No-duplicate-seed constraint

When generating rules (initial or refresh), no seedId may appear in more than one active rule simultaneously.

---

## Template structure

```js
{
  id: string,          // unique string key
  level: 1|2|3,
  difficulty: number,  // target satisfied location count
  description: string,
  seeds: string[],     // seedIds involved (used for biased assignment and no-duplicate check)
  check: (pots, tick) => boolean
}
```

---

## Rule levels and types

### Level 1 — Single-seed presence (difficulty 6)

`{seedId}_present`

`check`: any pot has `seedId` (any growth stage).

15 templates (one per seed).

---

### Level 2a — Co-presence pair (difficulty 6)

`{a}_{b}_copresent`

`check`: at least one pot has `a` at SEEDLING+ AND at least one has `b` at SEEDLING+.

Description says "as seedlings or older".

15 templates (one per adjacent pair).

---

### Level 2b — Adjacent pair (difficulty 3)

`{a}_{b}_adjacent`

`check`: two consecutive pots (wrapping) hold `a` and `b` in either order, both at SEEDLING+.

Description says "as seedlings or older".

15 templates.

---

### Level 3a — Sandwich (difficulty 3)

`{b}_sandwiches_{a}` — check: both neighbours of some `a` pot (GROWN+) are `b` (GROWN+).  
`{a}_sandwiches_{b}` — check: both neighbours of some `b` pot (GROWN+) are `a` (GROWN+).

Descriptions say "all grown or older".

30 templates (2 per pair).

---

### Level 3b — Triple planting (difficulty 6)

`{seedId}_triple`

`check`: seed appears GROWN+ in 3 or more pots.

Description says "as a grown plant or older".

15 templates.

---

90 templates total (15 + 15 + 15 + 30 + 15). A sixth type, "next to empty" (`{seedId}_next_empty`, L2, difficulty 8), existed through v16 and was removed in the v16→v17 migration (`server/state.js`) — any gardener holding it gets a same-level replacement picked via `pickNewRuleForLevel`.

## Initial rule assignment (`pickInitialRules(originSeedId)`)

Picks 4 rules biased toward the gardener's origin seed, with no seed appearing twice:

1. L1 matching origin seed
2. L1 any (avoids already-used seeds)
3. L2 matching origin seed (avoids already-used seeds)
4. L3 matching origin seed (avoids already-used seeds)

Falls back to any unused, non-overlapping template at the required level if no seed-matching one is available.

---

## Refresh (`pickNewRuleForLevel(level, existingRules)`)

Picks a random unused template at the given level, avoiding all templates currently in the gardener's slots (including refreshing slots) and templates whose seeds overlap with any active rule's seeds.

---

## Pot arrangement

Pots are stored as an ordered array. Rules treat them as a **ring** (index `i+1` wraps back to 0). The "adjacent" and "sandwich" checks rely on this ring structure, so pot order matters. Pot order is fixed at location creation and never changes.
