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

## Current state

Skeleton + reference model complete. Entries marked `status: "example"` /
`confidence: "placeholder"` are schema demonstrations awaiting Phase A–D research
(see `PLAN.md` §4). The site renders whatever valid data lands in `data/`.
