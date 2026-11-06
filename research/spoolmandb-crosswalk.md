# SpoolmanDB ↔ Filament Field Guide crosswalk

Date: 2026-09-20. Compared against Donkie/SpoolmanDB @ main (67 brand files) and its
5 open PRs. Companion deliverable: `research/spoolmandb-contributions/` (SpoolmanDB-format
candidate files + REVIEW.md for manual verification before any PR).

## Direction A — SpoolmanDB content ingested INTO the Field Guide

24 brands existed in SpoolmanDB but not here; all now have manufacturer entries:
nth-grillon, abaflex, aurapol, ambrosia, printy-please, closin, cr3d, filament-unger,
gembird, gst3d, ldo, nobufil, polar-filament, printed-solid, r3d, ratrig,
redline-filament, smart-materials-3d, tectonic-3d, unitak3d, verbatim, voolt3d,
winkle, zyltech. Plus vanyo (from open PR #479) and siraya-tech (owner request).

Three apparent misses were identity matches, not gaps: SpoolmanDB "Fusion" =
fusion-filaments, "Spectrum" = spectrum-filaments, "ZIRO 3D" = ziro.

9 new filament entries closing SpoolmanDB-vocabulary gaps: pvdf, pa11-cf, ppe, tpi,
peek-cf, pc-pbt-cf, tpu-55d, tpu-64d, lw-peba. 25+ new trade-name mappings resolve
branded material strings to chemistry (BioFusion/GreenTEC/Pearl→PLA family,
GreenTEC Pro + HTPLA+→pla-ht, Flax→pla-wood, PLAX→pla-plus, ASA-X + EasyASA→asa,
HTPET+→pet, ANASA TPC→cope, ABS-T→mabs [Filament PM product — NOT Verbatim,
verified absent from Verbatim's catalog], FibCR20→abs-gf, PunkFil PETG-CF10→petg-cf,
PAHT-CF/PET-CF (AzureFilm), PROTEOS→pva, VULCAN PEKK/PEI/PPSU, Cat Yarn→abs).

SpoolmanDB material strings with NO Field Guide entry (deliberate, documented):
POM/Acetal (materials.json only + NTH Grilon POM — no researched entry yet; open item),
PVDF+Graphene (noted on pvdf), TPU-75D (single vendor, no published specs),
BIOFUSION/GREENTEC/FLAX/PEARL (mapped as trade names, not chemistries),
Durabio (Verbatim, noted), iglidur I150/I180 (undisclosed base polymer),
316L/17-4PH metal-filled (out of scope), PETT/t-glase (noted on taulman3d),
Semi flexible (FPE) and ABS-T generic rows (materials.json vocabulary only).

## Direction B — Field Guide content authored FOR SpoolmanDB

See `research/spoolmandb-contributions/REVIEW.md` for the full per-brand tables.
23 candidate brand files, 111 filament entries, 504 colors; all 23 pass their JSON
schema; their lint passes except the by-design `spool_weight` gaps (110 of 111 —
their policy requires a physically measured empty-spool weight; only Atomic
Filament publishes one). 501 of 504 hexes are flagged approximations of basic
color names; 72% of densities fall back to SpoolmanDB's own materials.json
generics (every substitution itemised).

Not authored, with reasons: snapmaker (already pending upstream as PR #478),
igus (no material mapping), voxelab (site TLS-expired, no source),
chckx3d (defunct site), colorFabb/Duramic/NinjaTek/
OVV3D/UltiMaker/Comgrow (no publishable color data — swatch reading needed).

## Open-PR correlation (checked 2026-09-20)

#481 Sunlu glow (update) · #480 Prusament expansion (adds PA11-CF/PP-CF/PP-GF —
correlates with our new pa11-cf entry) · #479 VANYO (new; now also in our catalog)
· #478 Snapmaker (new; we deliberately did not author it) · #477 schema: manufacturer-
wide colors + RAL→hex (if merged, would ease the hex-approximation problem for
Direction B). No collisions with our 23 candidates.

## Retail house brands (owner-corrected 2026-09-20)

An automated pass wrongly reported Hobby Lobby sells no filament — it does (own-brand
PLA + Silk PLA under kids-crafts; the Field Guide entry was already correct). Added on
owner report: insignia (Best Buy house brand — PLA/Matte PLA/PETG/TPU-95A, full published
specs, OEM undisclosed) and michaels (Make Market — PLA-only line: Basic/Matte/Silk/
Glitter/White Marble, no published temps, OEM undisclosed). SpoolmanDB candidates
authored for all three (hobbylobby.json, insignia.json, makemarket.json) — basic-color
hex approximations flagged; Make Market Silk/Marble lines and multi-color silks skipped
pending color data.

## Status changes discovered during research

Printed Solid → acquired by Prusa Research 2022, rebranded Prusa USA Inc (Jul 2026).
KVP → acquired by Toner Plastics (Aug 2024), now "Village Plastics", relocated MA.
taulman3D → domain squatted; survives as "Xtellar Taulman" via MatterHackers.
chckx3d, voxelab, ovv3d, real-filament sites unreachable/degraded at review time.

## Re-check 2026-11-06

SpoolmanDB `main` is now 86 brand files and about 80 PRs are open. All 11 newly merged brands and all 40
new pending-PR brands now have catalog entries. Full detail, including the PR-by-PR list and the overlap with
our Direction-B candidates, is in `research/brand-audit-2026-11-06.md`.
