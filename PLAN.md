# Filament Field Guide — Research & Build Plan

A practical field guide to FDM 3D-printing material selection and use — a catalog of materials, manufacturers, and build plates, published as a
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
- **Phase B — Variations, grades & specialty formulations.** Each gets its own entry with
  a `base_type` link and independently scored ease/feeding fields, because grades behave
  differently. Scope: (a) PLA variants — silk, matte, gradient, high-flow/high-speed,
  wood/metal-filled, glow, foaming LW-PLA; (b) fiber-filled — pla-cf, petg-cf, petg-gf,
  pa6-cf, pa12-cf, pet-cf, pp-gf, asa-cf; (c) blends & co-polymers — cope (Polymaker
  Panchroma CoPE), pc-abs, pc-pbt, abs-gf; (d) polyamide grades — pa6, pa12, pa66, ppa
  (high-temp polyphthalamide); (e) TPU/flex by shore grade — tpu-60a, tpu-85a, tpu-90a,
  tpu-95a, tpu-58d/60d, tpu-64d/68d (AMS-grade), with per-grade drive/AMS/feeding-assistant
  values (90A is not AMS-safe, 60D is); (f) high-performance — peek, pekk, pei-ultem,
  pps, pps-cf, ppsu; (g) specialty lines from manufacturer wikis (e.g. Polymaker
  specialty: PolyCast castable, PolySmooth/PVB done, ESD-safe, flame-retardant,
  conductive). Functional additives (FR, ESD) are `variation_kind` values on their base
  chemistry. Reference: Polymaker wiki specialty & Panchroma pages, Bambu/Prusa material
  line-ups, 3DXTech catalog for high-performance.
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

- 2026-08-01 — **Tranche 3 + ambiguity resolution complete** (owner request): 12
  chemistries (abs-plus, petg-plus, cpe, pbt, pe, pmma, sbs, mabs, pp-cf, pha, pa612,
  copa) and 12 brands (CC3D, 3D-Fuel, Numakers, Cookiecad, Yoline Lab, Amazon Basics,
  VoxelPLA, IIID Max, MarsWork, OVV3D, Siddament, Hobby Lobby) added → 84 filaments /
  71 manufacturers / 13 plates. Ambiguities: CPE distinct (≠CoPE, ≠PETG/PCTG); PAHT
  vendor-dependent (Bambu→pa-cf); APLA→pla-plus; PIPG→petg; VoxelPLA independent of
  Voxelab; CoPA split from pa (11 trade names + 10 product lines migrated). Glitter/
  stone products migrated off base pla (13+15, catch-all rows preserved). 144 brand
  mappings merged; 8 stale product lines remapped to new ids. Notable data-quality
  finds preserved in conflicts: eSUN PETG+ measures 15x LESS ductile than their base
  PETG (contradicts 'high toughness' marketing); Spectrum HDPE density outlier; SBS
  ships with no published shore hardness anywhere.
## Changelog

- 2026-08-01 — **Tranche 2 + plate vendor cross-walk complete** (owner requests):
  12 coverage-gap filaments added (pa-cf, abs-cf, pet-gf, abs-esd, pla-stone,
  pla-glitter, pla-ht, pla-cast, peba, lw-asa, lw-tpu, support-breakaway → 72 total);
  2 new plates (g11-garolite, geckotek-ez-stick → 13) with owner-provided vendor
  descriptions as primary sources; 34 plate trade names merged (7 vendors; CryoGrip/
  ICE class-mapped to supertack); CHCKX3D mappings merged; Fable relocations: eSUN
  ePA-CF → pa-cf, Fiberon PET-GF15 → pet-gf, Eryone ASA-LW → lw-asa, varioShore →
  lw-tpu. Plate gaps queued (Tyson T-95, Wham Bam PEX, CryoGrip chemistry). README
  current-state rewritten. Note: both workflows died silently overnight mid-collation
  and were resumed from cache — future long runs should expect this and resume.

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
- 2026-07-31 — **Feeding/handling model added** (owner request): schema gains `feeding`
  (drive_system, ams_compatible, feeding_assistant_recommended), `printing.
  enclosure_open_for_cooling`, `properties.shore_hardness`. Glossary: new entries for all
  five plus part_cooling_fan_pct, and `ease_of_print` rewritten to document the composite
  methodology (7 weighted factors, fixed anchors, per-grade scoring). All 15 entries
  populated from Bambu AMS/heat-creep wikis + Prusa MMU docs (opus pass, 7 judgment calls
  accepted). Phase B scope expanded to per-grade entries: TPU shore grades, PA grades
  (pa6/pa12/ppa), blends (CoPE, PC-ABS), specialty and high-performance lines. Site
  renders feeding sections, AMS filter, shore badges; sheets re-verified single-page.
- 2026-07-31 — **Phase B complete**: 40 variation/grade entries (catalog now 55 filaments)
  — PLA aesthetic + functional variants, fiber-filled composites, PA grades (pa6/pa12/
  pa66/ppa) + composites, six TPU shore grades with per-grade feeding/AMS values
  (monotonic ease 2→7 from 60A to 68D; only 60D conditional / 68D yes for AMS), blends
  (CoPE, PC-ABS, PC-PBT, ESD, FR), and the high-performance tier (PEEK/PEKK/PEI-ULTEM/
  PPS/PPS-CF/PPSU — temperature_tolerance 10 ceiling now in use). 79 source conflicts
  recorded per-entry; collator overrides accepted (pp-gf ease 6→4 uv 9→5; pc-abs rescaled
  to catalog anchors; abs-fr 132 °C melting-point datasheet claim rejected; pps bed-temp
  scrape error corrected). Validator: 0 errors, 0 warnings at 55/58/1 entities.
- 2026-08-01 — **Phase D complete**: 11 plate entries (PEI smooth/textured/satin/patterned,
  G10/garolite, borosilicate glass, carbon-fiber, PC/Cool-Plate class, SuperTack class,
  BuildTak class, PP sheet) with 36-46 filament-compatibility rows each, prep/cleaning/
  removal/stuck-print guidance. Patterned-PEI category has no manufacturer specs anywhere
  (PEI/PEO/PEY naming chaos) — confidence low.
- 2026-08-01 — **Phase E complete**: symmetric closure of bonds_with (82 fixed) and
  support mirrors (129 fixed); OEM reciprocals (Comgrow↔Creality, Prusa↔Filament PM);
  347+ plate_recommendations backfilled from plate matrices; TPU layer-adhesion rubric
  clarified in glossary (score = Z/XY anisotropy by design).
- 2026-08-01 — **GF addendum** (owner request): tpu-gf, pa6-gf, asa-gf, pc-gf, pla-gf
  added (60 filaments total). All confirmed real products; several suspect datasheet
  figures flagged (asa-gf density identical to base; pc-gf density below rule-of-mixtures).
- 2026-08-01 — **Trade-name cross-walk** (owner request): all 58 manufacturer catalogs
  reviewed; 991 product→filament mappings merged into `trade_names` (new schema field,
  searchable on the site); product_lines fully populated. 190 unmapped products recorded
  in `research/coverage-gaps.md`; top suggested new ids: pa-cf (generic, 11 mfrs),
  pla-stone (10), abs-cf (7), peba (6), pla-glitter (6), lw-asa (5), pla-ht (5),
  lw-tpu (4), pet-gf (4), abs-esd (4), plus castable/burnout PLA and cleaning filament
  as non-print categories. These are the Phase B tranche-2 queue.
- 2026-08-01 — **3dfilamentprofiles.com coverage diff** (owner request): 12 missing
  brands identified (CC3D 273 profiles, 3D-Fuel 200, Numakers 193, Cookiecad 171,
  Yoline Lab 121, Amazon Basics 81, IIID Max 64, MarsWork 56, OVV3D 54, plus 3
  unresolved) and 10 base-chemistry material gaps beyond tranche 2 (abs-plus, petg-plus,
  pha, pbt, pa612, sbs, pmma, pe, copa, mabs) — queued in research/coverage-gaps.md as
  **tranche 3** (brands → Phase C tranche 2; materials → Phase B tranche 3). Ambiguities
  to resolve first: CPE↔cope/pctg, PAHT↔ppa, VOXELPLA↔voxelab, APLA, PIPG. Diff also
  confirmed our high-performance and PA-grade coverage exceeds theirs.
- 2026-08-01 — **CHCKX3D added** (owner request): 59th manufacturer; 15 product
  mappings staged; identity heavily caveated (claimed US manufacturer, evidence points
  to undisclosed OEM rebrand; two independently-documented mislabeled products recorded
  in provenance.conflicts). PP-CF added to gap queue.
- 2026-08-01 — **Plate damage-avoidance model** (owner request): plate schema gains
  `damage_avoidance` [{item, reason, severity: destroys|degrades|cosmetic}] + glossary
  entry; all 11 plates populated (8-10 surface-specific rows each — acetone/solvent
  attack per polymer, scraper/abrasive rules that differ by surface, thermal-shock and
  flexing limits, overtemperature). Notable: PC-plate IPA environmental-stress-cracking
  hazard sourced to a peer-reviewed study; abrasives are maintenance on G10/smooth-PEI
  but terminal on satin/SuperTack/patterned. Site renders severity-badged sections,
  "Never:" lines on sheets, and severity counts in plate compare.
- 2026-08-01 — **Named**: the project is now the **Filament Field Guide** (owner choice;
  suggested GitHub repo name `filament-field-guide`). "Filament Atlas" was rejected due
  to the existing Filamatlas project. Site title, header brand, README, and PLAN updated.
