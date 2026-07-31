# Filament Reference — Research & Build Plan

A catalog of FDM 3D-printing materials, manufacturers, and build plates, published as a
filterable GitHub Pages site, with a data model designed to be extended by future
research sessions.

## 1. Architecture at a glance

- **Reference model**: one JSON file per entity (filament type, manufacturer, plate type)
  under `data/`, validated against JSON Schemas in `schema/`. A generated manifest
  (`data/index.json`) lists every entity so the static site can load them without a server.
- **Site**: static `index.html` + vanilla JS at the repo root. GitHub Pages serves the
  `main` branch root — no build step. Editing a data file *is* the deployment.
- **Glossary-driven tooltips**: every property key maps to an entry in `data/glossary.json`
  (definition, why it matters, units, scoring rubric). The site renders tooltips and the
  glossary page from the same source.
- **Validation**: `scripts/validate.py` checks every data file against its schema and
  rebuilds the manifest. A GitHub Actions workflow runs it on every push.

## 2. Model delegation policy (for all research sessions)

| Role | Model | Work |
|---|---|---|
| Orchestration, schema/architecture decisions, conflict resolution between sources | Fable (main session) | never delegated |
| Data collation: merging multi-source research into schema-valid JSON, writing site/tooling code | Opus | escalate stuck decisions to Fable |
| Research: reading manufacturer sites, spec sheets, guides; extracting properties with citations | Sonnet | returns structured notes with sources |
| Simple gathering: URL lists, brand name lists, link checking, price spot-checks | Haiku | no analysis or judgment calls |

## 3. Entity model summary

### Filament type (`schema/filament.schema.json`)
Identity (name, aliases, polymer **class** for chemical grouping), printing settings
(nozzle/bed/ambient temps, speed, `enclosure_recommended`, `heated_chamber_required`),
drying (temp, hours, method) and storage with **dryness validation** signs, price range
per kg, recommended and not-recommended use cases, suitability flags (food contact,
load bearing, high temperature, outdoor), measured/derived properties (shrinkage %,
density, weight-per-volume and volume-per-weight, HDT / glass transition / max service
temp), 1–10 rubric scores (ease of print, dimensional stability, warp tendency, layer
adhesion, compression strength, UV / weather / water tolerance), compatibility
(bonds-with, usable support/interface materials), variations & specialty formulations
(silk, matte, CF/GF-filled, high-flow, etc. — never size or weight), and provenance
(sources, `last_verified`, `confidence`).

### Manufacturer (`schema/manufacturer.schema.json`)
Name, brands operated, known OEM/subcontract relationships, **countries of manufacture**
(distinct from markets sold in), HQ, online endpoints (site, store, docs, social, support),
product lines offered, plate products if any, provenance.

### Plate type (`schema/plate.schema.json`)
Surface chemistry/makeup, manufacturers offering it, per-filament compatibility
(recommended / usable-with-prep / avoid) with temperature recommendations, preparation
and cleaning, model removal technique, stuck-print recovery, lifespan/wear notes, provenance.

### Glossary (`data/glossary.json`)
One entry per property/measurement: definition, why & where it matters, units, and the
scoring rubric for 1–10 scales. Single source of truth for site tooltips.

## 4. Research phases (future sessions)

Each phase is an independent session that reads `RESEARCH_GUIDE.md`, runs research with
sonnet/haiku agents, collates with opus, and commits schema-valid JSON.

- **Phase A — Taxonomy & core filaments.** Finalize polymer classes; author full entries
  for the ~15 core types (PLA, PETG, ABS, ASA, TPU, PC, PA/Nylon, PVA, HIPS, BVOH, PP,
  PCTG, PVB, PET, TPE). Sources: Simplify3D, Prusa, Bambu, BCN3D, All3DP guides,
  MDPI/academic property tables.
- **Phase B — Variations & specialty formulations.** Per class: silk/matte/gradient PLA,
  high-flow, CF/GF-filled, flame-retardant, ESD-safe, conductive, wood/metal-filled,
  foaming (LW-PLA), high-temp (PPS, PEEK, PEI/ULTEM, PPA). Each variation gets its own
  entry with a `base_type` link.
- **Phase C — Manufacturers (target ~60–100).** Brands, OEM/white-label relationships,
  countries of manufacture, endpoints. Sonnet per manufacturer cluster; haiku for
  endpoint/link gathering; opus collates. Flag conflicting origin claims for Fable review.
- **Phase D — Build plates.** PEI smooth/textured, satin, G10/Garolite, glass, carbon
  fiber, PC, spring steel bases, holographic/patterned; plate manufacturers (Bambu, Prusa,
  Wham Bam, BIQU, Energetic, FYSETC, etc.); compatibility matrices, prep/cleaning/removal.
- **Phase E — Cross-reference & scoring calibration.** Fill bonds-with/support matrices,
  normalize 1–10 scores against rubrics so scores are comparable across entries, dedupe
  conflicting data, raise `confidence` levels.
- **Phase F — Continuous refresh.** Periodic sessions re-verify prices, links, and new
  product lines; `last_verified` drives a staleness report from `scripts/validate.py`.

## 5. Site features

Filter/sort table across all discovered metrics (use case, polymer class, ease of print,
temperature stability, high-temp / outdoor / food-contact / load-bearing suitability, price,
enclosure requirements…); linkable per-entity pages (hash routing) each with a **full
engineering view** and a **single-page printable reference sheet** (print stylesheet);
multi-select compare for filaments and separately for plates; glossary page; tooltips on
every property sourced from the glossary.

## 6. Update contract for future tasks

1. Read `RESEARCH_GUIDE.md` and the relevant schema before writing data.
2. Add/edit only files under `data/`; one entity per file; `id` = filename.
3. Run `python scripts/validate.py` — it must pass and regenerates `data/index.json`.
4. Never edit generated files by hand; never change schemas without a Fable-level
   decision recorded in `PLAN.md` changelog.
5. Every entry cites sources and sets `last_verified` (ISO date) and `confidence`.

## 7. Open items / ideas discovered so far

- **Phase C follow-ups (2026-07-31):** endpoint link-checking cannot run via curl from
  the research sandbox (all URLs return 000) — needs WebFetch-based verification in a
  future session. Filament ids referenced by product lines but not yet in `data/filaments/`
  (Phase A/B must adopt these slugs or Phase E must rename): abs, tpu, pa, pc, pva, hips,
  pp, pctg, pvb, pcl, tpc, tpe, peek, pei, pekk, ppsu, pps, pha, peba, pvc, pvdf, pmma,
  pla-cf, petg-cf, petg-gf, pa-cf, pet-cf, pp-gf. Corporate-ownership edges (Michelin→
  Fenner→NinjaTek, Braskem→taulman3D, Nexa3D→Essentium) now encodable via new
  `parent-company` relationship value — several entries still describe these in notes only.
  Essentium deliberately skipped (absorbed; no independent presence) — revisit if
  historical brands are wanted. 3DJake's origin recorded as "European Union (specific
  country undisclosed)" — non-country string, revisit if country filtering is added.

- Recyclability & sustainability notes per polymer class (candidate future property).
- Abrasiveness (hardened-nozzle requirement) — included as `requires_hardened_nozzle`.
- Filament–nozzle-material interactions (brass vs hardened vs ruby) — candidate.
- Regional price variance and availability — candidate for Phase F.
- Safety/VOC emissions per material (styrene, particulates) — candidate property.

## Changelog

- 2026-07-31 — Initial plan, schemas, skeleton site (this session).
- 2026-07-31 — Added `emissions` block to filament schema (VOC level, particulate level,
  primary emissions, ventilation requirement) + glossary entries, per owner request.
- 2026-07-31 — Seeded `research/verified-oem-relationships.md` with 15 owner-verified
  brand/OEM mappings for Phase C ingestion.
- 2026-07-31 — **Phase C first tranche complete**: 58 manufacturer entries (7 clusters,
  sonnet research → opus collation), all schema-valid. 85 source conflicts recorded in
  per-entry `provenance.conflicts`. Extended `oem_relationships.relationship` enum with
  `distributes` and `parent-company`. Fable overrides: qidi-tech price_tier → mid;
  ninjatek/colorFabb → distributes.
- 2026-07-31 — **Phase A complete**: all 15 core filament types researched and written
  (pla, petg, abs, asa, tpu, tpe, pa, pc, pp, pva, hips, bvoh, pctg, pvb, pet) — full
  printing/drying/storage/properties/scores/compatibility/emissions data, 84 source
  conflicts recorded per-entry. Scores calibrated against fixed anchors (pla ease 10 /
  warp 1, petg 7/3, asa 5/7/uv 9); validator passes with zero warnings (all
  cross-references now resolve). Fable calibration override: hips ventilation
  recommended → required (styrene profile identical to ABS/ASA). Known tension logged:
  tpu/tpe layer_adhesion=3 follows the rubric's Z/XY-ratio definition (Ultimaker ~27%)
  and contradicts the community's 'TPU has great layer adhesion' folklore — revisit the
  rubric or the score in Phase E.
