# Editor Hardening Implementation Plan

> **For agentic workers:** Execute task-by-task. Design: `docs/design/2026-09-11-editor-hardening-design.md`.

**Goal:** Fix table-row InputNumber staleness (unit exp), unused unit add, Formation/Inventory gaps, validate hardening.

**Architecture:** Snapshot rows for el-table; `void editor.rev` everywhere; strip unused unlocks on save; expand REQUIRED_KEYS.

**Tech Stack:** Vue 3, Element Plus, Vitest, existing session.revision.

## Global Constraints

- Table rows = new objects + primitives + `index`
- InputNumber: `@update:model-value` only
- Single root + `:data-ss-rev="editor.rev"`
- Save strips unused unit unlock ids (no hard fail on polluted saves)

---

### Task 1: UnitsTab snapshot + unused filter
- [ ] Test: source has row.index / no indexOf for exp; groups filter unused
- [ ] Implement UnitsTab view rows + isUnusedEntry on add list
- [ ] Verify

### Task 2: PlanetsTab snapshot + select
- [ ] Snapshot rows; `@update:model-value` on faction select
- [ ] Verify

### Task 3: FormationTab drop invTick
- [ ] Replace invTick with void editor.rev
- [ ] Verify

### Task 4: InventoryTab single root
- [ ] Wrap dialog inside root div
- [ ] Verify

### Task 5: Explicit rev + contract comments
- [ ] editorBindings iron rules; Resources/Character/WB explicit rev fields if needed
- [ ] Verify

### Task 6: Validate / REQUIRED_KEYS / WB / TE
- [ ] CF strip unused unlocks in unlockAll + validate/serialize path
- [ ] Expand REQUIRED_KEYS + fix fixtures
- [ ] WB silver validate; TE stack min
- [ ] Verify

### Task 7: Full suite
- [ ] vitest + typecheck
