# Filament Field Guide

A structured, research-driven catalog of FDM 3D-printing materials, manufacturers, and
build plates — published as a filterable static site via GitHub Pages.

## Quick start

```bash
# Serve locally (fetch() requires http, not file://)
python -m http.server 8000
# open http://localhost:8000

# Validate data + regenerate the manifest after any data change
pip install jsonschema
python scripts/validate.py
```

## Enabling GitHub Pages

Repo Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.
The site is pure static files; every push to `main` redeploys automatically. The
`Validate data` workflow gates pushes on schema validity.

## Repository layout

| Path | Purpose |
|---|---|
| `PLAN.md` | Research & build roadmap, phase definitions, changelog |
| `RESEARCH_GUIDE.md` | The contract future research sessions follow to add data |
| `schema/` | JSON Schemas — the reference model |
| `data/filaments/` `data/manufacturers/` `data/plates/` | One JSON file per entity |
| `data/glossary.json` | Property definitions, rubrics — powers site tooltips |
| `data/index.json` | Generated manifest (never hand-edit) |
| `research/` | Verified seed data and research notes for upcoming phases |
| `scripts/validate.py` | Schema validation, cross-ref checks, manifest generation |
| `index.html`, `assets/` | The site — vanilla JS, no build step |

## License

Dual-licensed: code under [MIT](LICENSE), data and written content under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — reuse freely with
attribution to the Filament Field Guide. Dataset values are compiled from cited
public sources (see each entry's `provenance.sources`); verify critical
parameters against current manufacturer datasheets.

## Current state

Phases A–E complete, plus two variant tranches, a build-plate vendor cross-walk,
and a trade-name cross-walk of every manufacturer catalog. The catalog holds:

- **72 filaments** — 15 base chemistries plus researched variant entries for
  aesthetic/functional PLA grades, fiber-filled composites (CF/GF across nine base
  polymers), polyamide grades (PA6/PA12/PA66/PPA + composites), six TPU shore grades
  with per-grade AMS/drive-system data, blends (CoPE, PC-ABS, PC-PBT), specialty
  (ESD, FR, castable, annealable HT-PLA, stone/glitter, foaming LW grades, PEBA),
  the high-performance tier (PEEK/PEKK/PEI-ULTEM/PPS/PPSU), and support materials.
- **59 manufacturers** — brands, OEM/white-label relationships (including owner-verified
  mappings), countries of manufacture, endpoints, product lines, and 1,000+ trade-name
  mappings so marketing names (NinjaFlex, PolyTerra, PAHT-CF…) resolve to entries.
- **13 build plates** — full compatibility matrices, prep/cleaning/removal/stuck-print
  guidance, severity-rated damage-avoidance lists, and vendor trade names.

Every entry carries per-source provenance (`sources`, `last_verified`, `confidence`)
with source disagreements preserved in `provenance.conflicts` rather than silently
resolved. Remaining queues live in `research/coverage-gaps.md` (tranche 3: ~10
chemistries, 12 brands, proprietary plate surfaces).
