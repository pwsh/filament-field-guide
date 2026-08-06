# Research Guide — how to update this catalog

This file is the contract for any future research session (human or agent) adding or
updating data. Follow it exactly and the site updates itself.

## Ground rules

1. **Data lives only in `data/`.** One JSON file per entity: `data/filaments/<id>.json`,
   `data/manufacturers/<id>.json`, `data/plates/<id>.json`. The `id` field must equal the
   filename (without `.json`), lowercase kebab-case.
2. **Schemas are law.** Validate against `schema/*.schema.json`. Run
   `python scripts/validate.py` before committing — it fails on schema violations, id
   mismatches, and dangling cross-references, and it regenerates `data/index.json`.
   Never hand-edit `data/index.json`.
3. **Never modify schemas or site code** in a research session. If the data you found
   doesn't fit the model, record it in the entry's `additional_notes` and add an item to
   "Open items" in `PLAN.md` for a Fable-level decision.
4. **Provenance is mandatory.** Every entry: `sources` (URLs/citations), `last_verified`
   (date you checked), `confidence` (`placeholder` → `low` → `medium` → `high`). Record
   source disagreements in `provenance.conflicts` instead of silently picking one.
5. **Variations are their own entries** with `base_type` pointing at the base filament
   (e.g. `pla-cf` → `base_type: "pla"`). Never treat spool size/weight as a variation.
6. **Scores use the glossary rubrics.** Before scoring 1–10, read the rubric in
   `data/glossary.json` for that key so scores stay comparable across entries. When you
   add a new property, add its glossary entry (definition, why it matters, units, rubric).
7. **Derived fields**: `grams_per_100cm3` = density × 100; `cm3_per_100g` = 100 / density.
   The validator checks these for consistency.
8. **Support-interface rule (added 2026-08-01 after a data-quality review):** never list a
   material, its variants, or any same-base-family material in `support_materials` /
   `usable_as_support_for`. Same-chemistry pairs weld — that is what `bonds_with` records —
   and a welding pair cannot be a removable support interface. Slicer-default same-material
   supports are breakaway-with-scarring, not an interface pairing, and do not belong in
   these fields. Chemically-blended families count too (e.g. PLA/PHA blends are PLA-family
   for this rule). The validator enforces self/same-family exclusion.
   **Extension (2026-08-06, second review):** `bonds_with` and the support fields are
   mutually exclusive at family level, across both directions and all files — a pair that
   welds can never also be a support interface, and vice versa. Decide the pair's role
   before recording it: dedicated support materials (PVA, BVOH, HIPS, breakaway) adhere as
   *removable interfaces* — never list their build-material partners in `bonds_with`.
   Weld groups (ABS↔ASA; the copolyesters PETG/PCTG/CPE/PET among themselves; PETG↔TPU)
   carry only bond edges. PLA↔TPU is ruled a support pair (weakest TPU pairing, releases
   cleanly). Do not list a material in its own `bonds_with` — self-bonding is implicit.
   The validator enforces all of this.

## Model delegation (per user policy)

- Sonnet agents: research — read manufacturer sites, datasheets, community guides; return
  structured notes with source URLs.
- Haiku agents: simple gathering only — link lists, brand-name enumeration, endpoint
  discovery. No judgment calls.
- Opus agents: collate research notes into schema-valid JSON; write any tooling.
- Fable (session model): resolves conflicting sources, approves schema changes, calibrates
  scoring.

## Reference sources

Property tables: Simplify3D materials table, partmfg.com filament table, BCN3D filament
properties guide, 3D Maker Engineering guide, Bambu Lab filament guide, Sovol strength
guide, All3DP filament overview, Formlabs materials blog, MDPI Appl. Sci. 16(15):7601.
Prefer manufacturer datasheets for numbers; prefer community consensus (Prusa/Bambu wikis,
r/3Dprinting, CNC Kitchen tests) for printability and real-world behavior. Cite both.

## Workflow for a research phase

1. Read `PLAN.md` §4 for the phase scope; check existing `data/` to avoid duplicates.
2. Fan out sonnet researchers per entity cluster; haiku for endpoint/link gathering.
3. Opus collates into JSON per schema; sets `status` (`draft` → `researched`) and honest
   `confidence`.
4. Run `python scripts/validate.py` (must pass).
5. Update `PLAN.md` changelog with one line describing what was added/changed.
