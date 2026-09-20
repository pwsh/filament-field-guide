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

### Populating a Spoolman instance

`scripts/spoolman_import.py` pushes the vendors and filaments this catalog carries
that SpoolmanDB upstream does not — read from `research/spoolmandb-contributions/` —
into a running Spoolman server over its REST API.

```bash
# dry run (default): prints what would be created, writes nothing
python scripts/spoolman_import.py --url http://spoolman.local:7912

# create them; add --update to also sync changed values onto filaments
# that already exist, and --brands to scope to certain candidate files
python scripts/spoolman_import.py --url http://spoolman.local:7912 \
    --apply --update --brands amolen,insignia

# also pull brands from open SpoolmanDB pull requests, before they merge
python scripts/spoolman_import.py --url http://spoolman.local:7912 --pr 478,479
```

Re-running is safe: unchanged filaments are skipped. The `--url` takes a plain
`http://` base (what most installs use) or `https://`, with `--insecure` for a
self-signed certificate on the latter. `--pr` currently of interest: #478
(Snapmaker) and #479 (VANYO) add new brands, while #480 (Prusament) and #481
(Sunlu) update brands SpoolmanDB already carries — importing those creates local
duplicates of Spoolman's native external-database entries, and the script warns
before doing so. Note that some color hex values are approximations — those are
flagged in the contributions' `REVIEW.md`.

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

- **99 filaments** — 18 base chemistries plus researched variant entries for
  aesthetic/functional PLA grades, fiber-filled composites (CF/GF across nine base
  polymers), polyamide grades (PA6/PA12/PA66/PPA + composites), ten TPU shore grades
  with per-grade AMS/drive-system data, blends (CoPE, PC-ABS, PC-PBT), specialty
  (ESD, FR, castable, annealable HT-PLA, stone/glitter, foaming LW-PLA/LW-TPU/LW-PEBA, PEBA),
  the high-performance tier (PEEK/PEEK-CF/PEKK/PEI-ULTEM/PPS/PPSU/PVDF/TPI/PPE), and support materials.
  Every filament carries a curated "alternatives to consider" list with trade-off reasoning.
- **97 manufacturers** — brands, OEM/white-label relationships (including owner-verified
  mappings), countries of manufacture, endpoints, product lines, and 1,300+ trade-name
  mappings so marketing names (NinjaFlex, PolyTerra, PAHT-CF…) resolve to entries.
- **14 build plates** — full compatibility matrices, prep/cleaning/removal/stuck-print
  guidance, severity-rated damage-avoidance lists, and vendor trade names.

Every entry carries per-source provenance (`sources`, `last_verified`, `confidence`)
with source disagreements preserved in `provenance.conflicts` rather than silently
resolved. Remaining queues live in `research/coverage-gaps.md` (all research phases complete; the short unresolvable list — proprietary coating identities, SBS shore hardness — is documented there).
