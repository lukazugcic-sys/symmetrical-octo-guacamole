# Migration Backlog (Feature Freeze Window)

Status: **Feature freeze for new gameplay features is active** until architecture migration phases complete.

## Stable Behavior Baseline (Guardrails)
- [ ] Spin loop remains deterministic in flow (energy cost, free spin, streak, gamble cap).
- [ ] Reward claim flow remains idempotent (pending win, claim once, mission/achievement updates).
- [ ] Mission cycle preserves replace-on-claim behavior.
- [ ] Clan/raid/tournament counters maintain current progression semantics.
- [ ] Dungeon floor progression and token economy remain unchanged.
- [ ] Hero fragments, summon cost, and active hero cap remain unchanged.

## Risk-Tagged Migration Work

### Economy
- [ ] Extract reward math and progression formulas into domain services.  
  Risk: **economy**
- [ ] Lock current constants behavior with validation checks.  
  Risk: **economy**

### Persistence
- [ ] Introduce save envelope schema versioning and deterministic migration path.  
  Risk: **persistence**
- [ ] Add payload validation + recovery to safe defaults for corrupted saves.  
  Risk: **persistence**
- [ ] Isolate serializer/deserializer logic away from UI/runtime store code.  
  Risk: **persistence**

### Multiplayer
- [ ] Add stricter input sanitization for player/clan names before writes.  
  Risk: **multiplayer**
- [ ] Add stronger anti-abuse checks around raid operations and reward claims.  
  Risk: **multiplayer**
- [ ] Align Firestore rules documentation with current document fields (`membri`, ownership checks).  
  Risk: **multiplayer**

## Delivery Stages
- [ ] Stage A: Store modularization shell (no API break).
- [ ] Stage B: Domain logic extraction from hot paths.
- [ ] Stage C: Persistence hardening + migration.
- [ ] Stage D: Multiplayer hardening.
- [ ] Stage E: Performance/reliability checks.
