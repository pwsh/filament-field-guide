# SpoolmanDB contribution review

Output of a research-to-schema pass over 29 candidate brands. Every file in
`filaments/` is schema-valid against `filaments.schema.json` and clean under
`scripts/lint_filaments.py` except for the `spool_weight` errors, which are
**deliberate**: SpoolmanDB requires a *measured* empty-spool weight and we have
not weighed any spool. Only Atomic Filament carries spool weights, because they
are explicitly published in the manufacturer's own FAQ.

**Nothing here is ready to submit as-is.** See section 5.

- Files written: **23**
- Filament entries: **111**
- Colors: **504**
- Schema-valid: **23/23**
- Lint: **0 non-`spool_weight` errors**, 189 `spool_weight` errors (by design), 4 warnings

## 1. Per-brand summary

| File | Manufacturer | Lines | Colors | Schema | Lint | Data gaps | Confidence |
|---|---|---:|---:|---|---|---|---|
| `amolen.json` | Amolen | 3 | 4 | pass | 7 spool_weight (expected) | no density or extruder temps published; PLA Basic/Silk/Matte lines dropped (branded color names only) | Medium-Low |
| `atomicfilament.json` | Atomic Filament | 9 | 39 | pass | clean + 1 warn | no published density (all generic); ABS/ASA publish bed temp only; translucent/silk lines dropped | High |
| `coex3d.json` | COEX 3D | 12 | 26 | pass | 43 spool_weight (expected) + 1 warn | densities and temps well published; only Black/White/Natural (+1 published hex) survive the hex rule | High |
| `cookiecad.json` | Cookiecad | 1 | 2 | pass | 1 spool_weight (expected) | no temps, no density, no hex anywhere; only Solid PLA Black/White survives | Low |
| `filamentive.json` | Filamentive | 4 | 23 | pass | 6 spool_weight (expected) | no density published; PETg/TPU temps missing; 4 lines have no color list | Medium |
| `filamentpm.json` | Filament PM | 2 | 12 | pass | 5 spool_weight (expected) | no temps and no density on category pages; 6 of 8 lines have no color list | Medium |
| `ic3d.json` | IC3D | 3 | 23 | pass | 9 spool_weight (expected) | PETG/ABS density generic; 7 lines have no color list | High |
| `iemai3d.json` | IEMAI 3D | 5 | 5 | pass | 5 spool_weight (expected) | TDS give density but no nozzle or bed temperatures at all | High |
| `iiidmax.json` | IIID Max | 4 | 24 | pass | 4 spool_weight (expected) | no density published for any line (all generic); silk/glow/CF lines dropped | Medium |
| `jamghe.json` | Jamg He | 5 | 30 | pass | 6 spool_weight (expected) | no density published for any line; TPU has no temps | Medium |
| `kexcelled.json` | Kexcelled | 4 | 50 | pass | 6 spool_weight (expected) | densities and temps published per base line; specialty lines captured name-only | High |
| `kimya.json` | Kimya | 14 | 17 | pass | 15 spool_weight (expected) + 1 warn | no temps and no densities anywhere (reseller spec pages); every density is generic | Low |
| `kingroon.json` | Kingroon | 4 | 26 | pass | 5 spool_weight (expected) | only PETG Basic has density and temps; 5 lines have no color list | Medium |
| `landu.json` | Landu | 5 | 38 | pass | 5 spool_weight (expected) | no density published; PLA Basic dropped (branded color names only) | Medium |
| `marswork.json` | MarsWork | 2 | 10 | pass | 2 spool_weight (expected) | no density published; PLA Basic dropped for lack of a published spool weight | Medium-Low |
| `matterhackers.json` | MatterHackers | 6 | 44 | pass | 10 spool_weight (expected) | MH Build density generic; NylonG dropped (PA-GF has no generic density) | High |
| `pushplastic.json` | Push Plastic | 7 | 47 | pass | 7 spool_weight (expected) | no density and no temps published at all; only the sourced 1 kg SKU kept | Medium-Low |
| `real.json` | REAL | 4 | 19 | pass | 6 spool_weight (expected) + 1 warn | manufacturer site unreachable, data via reseller filamentz.nl; no densities; PETG bed temp approximate and omitted | Low |
| `sirayatech.json` | Siraya Tech | 1 | 1 | pass | 1 spool_weight (expected) | catalog is essentially colorless in the research; only one contract-brand SKU survives | Low |
| `taulman3d.json` | taulman3D | 4 | 5 | pass | 5 spool_weight (expected) | manufacturer domain squatted; historic TDS values, not re-verified - LOW CONFIDENCE | Low |
| `ultrafuse.json` | Ultrafuse | 1 | 12 | pass | 1 spool_weight (expected) | TDS gated; only the PLA line has temps and colors; density generic | Medium |
| `villageplastics.json` | Village Plastics | 4 | 16 | pass | 8 spool_weight (expected) | no densities; PETG has no temps; most ABS/PLA colors are branded names | Medium |
| `yolinelab.json` | Yoline Lab | 7 | 31 | pass | 32 spool_weight (expected) | TPU 75D and 64D have no published density; weights trimmed to the 1 kg SKU | Medium-High |

Lint warnings in full (none fail the build):

- `atomicfilament.json`: atomicfilament.json filaments[7]: density 1.3 is outside the usual 1.02-1.15 for ASA-CF
- `coex3d.json`: coex3d.json filaments[8]: density 1.19 is outside the usual 1.0-1.1 for ABS
- `kimya.json`: kimya.json filaments[8]: density 1.3 is outside the usual 1.15-1.25 for PC
- `real.json`: real.json filaments[2]: name 'RealFlex {color_name}' repeats the manufacturer name

The three density warnings are all generic-density substitutions or published
values (COEX's flame-retardant ABS really is 1.19). `RealFlex` genuinely is the
product line name, so the manufacturer-repeat warning is expected.

## 2. Approximated hex codes

No manufacturer hex was available for these. Each is a conventional
approximation for an unambiguous basic color name, applied consistently:

| Color name | Hex used |
|---|---|
| Black | `000000` |
| Blue | `1c50a0` |
| Brown | `6b4226` |
| Clear | `f5f5f5cc` |
| Gold | `c9a227` |
| Gray | `808285` |
| Green | `1e8449` |
| Grey | `808285` |
| Natural | `e8e0d0` |
| Nature | `e8e0d0` |
| Orange | `ef7622` |
| Pink | `e8739f` |
| Purple | `7b3fa0` |
| Red | `c8102e` |
| Silver | `c0c0c4` |
| Transparent | `f5f5f5cc` |
| White | `ffffff` |
| Yellow | `f2c300` |

`Transparent` / `Clear` carry an alpha byte and `translucent: true`. Two hexes
are exact CSS values (`000000`, `ffffff`), which the SpoolmanDB lint explicitly
permits for Black and White.

Every one of the **501** approximated colors, in full:

| Brand | Line (`name`) | Color | Approx hex |
|---|---|---|---|
| Amolen | `ABS` | Black | `000000` |
| Amolen | `ABS` | White | `ffffff` |
| Amolen | `PETG` | Transparent | `f5f5f5cc` |
| Amolen | `TPU` | Transparent | `f5f5f5cc` |
| Atomic Filament | `PLA` | Black | `000000` |
| Atomic Filament | `PLA` | Blue | `1c50a0` |
| Atomic Filament | `PLA` | Brown | `6b4226` |
| Atomic Filament | `PLA` | Clear | `f5f5f5cc` |
| Atomic Filament | `PLA` | Gold | `c9a227` |
| Atomic Filament | `PLA` | Gray | `808285` |
| Atomic Filament | `PLA` | Green | `1e8449` |
| Atomic Filament | `PLA` | Natural | `e8e0d0` |
| Atomic Filament | `PLA` | Orange | `ef7622` |
| Atomic Filament | `PLA` | Pink | `e8739f` |
| Atomic Filament | `PLA` | Purple | `7b3fa0` |
| Atomic Filament | `PLA` | Red | `c8102e` |
| Atomic Filament | `PLA` | Silver | `c0c0c4` |
| Atomic Filament | `PLA` | White | `ffffff` |
| Atomic Filament | `PLA` | Yellow | `f2c300` |
| Atomic Filament | `MeltMiser PLA` | Black | `000000` |
| Atomic Filament | `MeltMiser PLA` | White | `ffffff` |
| Atomic Filament | `Hi-Flow Pro PLA` | Black | `000000` |
| Atomic Filament | `PETG PRO` | Black | `000000` |
| Atomic Filament | `PETG PRO` | White | `ffffff` |
| Atomic Filament | `PETG PRO` | Gray | `808285` |
| Atomic Filament | `PETG PRO` | Blue | `1c50a0` |
| Atomic Filament | `PETG PRO` | Green | `1e8449` |
| Atomic Filament | `PETG PRO` | Red | `c8102e` |
| Atomic Filament | `PETG PRO` | Orange | `ef7622` |
| Atomic Filament | `PETG PRO` | Yellow | `f2c300` |
| Atomic Filament | `PETG PRO` | Purple | `7b3fa0` |
| Atomic Filament | `PETG PRO` | Pink | `e8739f` |
| Atomic Filament | `PETG PRO` | Brown | `6b4226` |
| Atomic Filament | `PETG PRO` | Gold | `c9a227` |
| Atomic Filament | `PETG PRO` | Silver | `c0c0c4` |
| Atomic Filament | `ABS` | Black | `000000` |
| Atomic Filament | `ABS` | Gray | `808285` |
| Atomic Filament | `ABS` | Natural | `e8e0d0` |
| Atomic Filament | `Flame Retardant ABS` | Black | `000000` |
| Atomic Filament | `ASA` | Black | `000000` |
| Atomic Filament | `ASA` | Natural | `e8e0d0` |
| Atomic Filament | `Carbon Fiber Black ASA` | Black | `000000` |
| Atomic Filament | `Nuclear Nylon v3` | Black | `000000` |
| Cookiecad | `Solid PLA` | Black | `000000` |
| Cookiecad | `Solid PLA` | White | `ffffff` |
| Filament PM | `ABS-T` | Black | `000000` |
| Filament PM | `ABS-T` | Orange | `ef7622` |
| Filament PM | `ABS-T` | Silver | `c0c0c4` |
| Filament PM | `ABS-T` | White | `ffffff` |
| Filament PM | `PETG` | Black | `000000` |
| Filament PM | `PETG` | Blue | `1c50a0` |
| Filament PM | `PETG` | Green | `1e8449` |
| Filament PM | `PETG` | Grey | `808285` |
| Filament PM | `PETG` | Orange | `ef7622` |
| Filament PM | `PETG` | Red | `c8102e` |
| Filament PM | `PETG` | White | `ffffff` |
| Filament PM | `PETG` | Yellow | `f2c300` |
| Filamentive | `PLA` | Red | `c8102e` |
| Filamentive | `PLA` | White | `ffffff` |
| Filamentive | `PLA` | Grey | `808285` |
| Filamentive | `PLA` | Purple | `7b3fa0` |
| Filamentive | `PLA` | Pink | `e8739f` |
| Filamentive | `PLA` | Blue | `1c50a0` |
| Filamentive | `PLA` | Silver | `c0c0c4` |
| Filamentive | `PLA` | Black | `000000` |
| Filamentive | `PLA` | Green | `1e8449` |
| Filamentive | `PLA` | Orange | `ef7622` |
| Filamentive | `PLA` | Yellow | `f2c300` |
| Filamentive | `PLA` | Gold | `c9a227` |
| Filamentive | `PETg` | Black | `000000` |
| Filamentive | `PETg` | White | `ffffff` |
| Filamentive | `PETg` | Transparent | `f5f5f5cc` |
| Filamentive | `PETg` | Blue | `1c50a0` |
| Filamentive | `PETg` | Grey | `808285` |
| Filamentive | `PETg` | Red | `c8102e` |
| Filamentive | `PETg` | Green | `1e8449` |
| Filamentive | `PETg` | Orange | `ef7622` |
| Filamentive | `PETg` | Silver | `c0c0c4` |
| Filamentive | `TPU 90A` | Black | `000000` |
| Filamentive | `rPA12` | Natural | `e8e0d0` |
| Ultrafuse | `PLA` | Black | `000000` |
| Ultrafuse | `PLA` | White | `ffffff` |
| Ultrafuse | `PLA` | Natural | `e8e0d0` |
| Ultrafuse | `PLA` | Grey | `808285` |
| Ultrafuse | `PLA` | Silver | `c0c0c4` |
| Ultrafuse | `PLA` | Yellow | `f2c300` |
| Ultrafuse | `PLA` | Orange | `ef7622` |
| Ultrafuse | `PLA` | Red | `c8102e` |
| Ultrafuse | `PLA` | Pink | `e8739f` |
| Ultrafuse | `PLA` | Blue | `1c50a0` |
| Ultrafuse | `PLA` | Green | `1e8449` |
| Ultrafuse | `PLA` | Gold | `c9a227` |
| IC3D | `PLA` | Black | `000000` |
| IC3D | `PLA` | Blue | `1c50a0` |
| IC3D | `PLA` | Grey | `808285` |
| IC3D | `PLA` | Natural | `e8e0d0` |
| IC3D | `PLA` | Orange | `ef7622` |
| IC3D | `PLA` | Red | `c8102e` |
| IC3D | `PLA` | White | `ffffff` |
| IC3D | `PLA` | Yellow | `f2c300` |
| IC3D | `PETG` | Black | `000000` |
| IC3D | `PETG` | Blue | `1c50a0` |
| IC3D | `PETG` | Grey | `808285` |
| IC3D | `PETG` | Red | `c8102e` |
| IC3D | `PETG` | White | `ffffff` |
| IC3D | `PETG` | Yellow | `f2c300` |
| IC3D | `ABS` | Black | `000000` |
| IC3D | `ABS` | Blue | `1c50a0` |
| IC3D | `ABS` | Green | `1e8449` |
| IC3D | `ABS` | Grey | `808285` |
| IC3D | `ABS` | Natural | `e8e0d0` |
| IC3D | `ABS` | Orange | `ef7622` |
| IC3D | `ABS` | Red | `c8102e` |
| IC3D | `ABS` | White | `ffffff` |
| IC3D | `ABS` | Yellow | `f2c300` |
| IIID Max | `High Speed PLA+` | Black | `000000` |
| IIID Max | `High Speed PLA+` | Blue | `1c50a0` |
| IIID Max | `High Speed PLA+` | Brown | `6b4226` |
| IIID Max | `High Speed PLA+` | Orange | `ef7622` |
| IIID Max | `High Speed PLA+` | Pink | `e8739f` |
| IIID Max | `High Speed PLA+` | Red | `c8102e` |
| IIID Max | `High Speed PLA+` | White | `ffffff` |
| IIID Max | `High Speed PLA+` | Yellow | `f2c300` |
| IIID Max | `High Speed PETG` | Black | `000000` |
| IIID Max | `High Speed PETG` | Grey | `808285` |
| IIID Max | `High Speed PETG` | Orange | `ef7622` |
| IIID Max | `High Speed PETG` | Purple | `7b3fa0` |
| IIID Max | `High Speed PETG` | Red | `c8102e` |
| IIID Max | `High Speed PETG` | White | `ffffff` |
| IIID Max | `High Speed PETG` | Yellow | `f2c300` |
| IIID Max | `High Speed TPU 95A` | Black | `000000` |
| IIID Max | `High Speed TPU 95A` | Orange | `ef7622` |
| IIID Max | `High Speed TPU 95A` | Red | `c8102e` |
| IIID Max | `High Speed TPU 95A` | Yellow | `f2c300` |
| IIID Max | `ABS` | Red | `c8102e` |
| IIID Max | `ABS` | Orange | `ef7622` |
| IIID Max | `ABS` | Gray | `808285` |
| IIID Max | `ABS` | Black | `000000` |
| IIID Max | `ABS` | Blue | `1c50a0` |
| Kexcelled | `THE K5 PLA` | White | `ffffff` |
| Kexcelled | `THE K5 PLA` | Orange | `ef7622` |
| Kexcelled | `THE K5 PLA` | Pink | `e8739f` |
| Kexcelled | `THE K5 PLA` | Black | `000000` |
| Kexcelled | `THE K5 PLA` | Red | `c8102e` |
| Kexcelled | `THE K5 PLA` | Yellow | `f2c300` |
| Kexcelled | `THE K5 PLA` | Gray | `808285` |
| Kexcelled | `THE K5 PLA` | Gold | `c9a227` |
| Kexcelled | `THE K5 PLA` | Blue | `1c50a0` |
| Kexcelled | `THE K5 PLA` | Green | `1e8449` |
| Kexcelled | `THE K5 PLA` | Silver | `c0c0c4` |
| Kexcelled | `THE K5 PLA` | Purple | `7b3fa0` |
| Kexcelled | `THE K5 PLA` | Natural | `e8e0d0` |
| Kexcelled | `THE K5 PLA` | Brown | `6b4226` |
| Kexcelled | `THE K5 PETG` | Brown | `6b4226` |
| Kexcelled | `THE K5 PETG` | White | `ffffff` |
| Kexcelled | `THE K5 PETG` | Orange | `ef7622` |
| Kexcelled | `THE K5 PETG` | Pink | `e8739f` |
| Kexcelled | `THE K5 PETG` | Black | `000000` |
| Kexcelled | `THE K5 PETG` | Red | `c8102e` |
| Kexcelled | `THE K5 PETG` | Yellow | `f2c300` |
| Kexcelled | `THE K5 PETG` | Gray | `808285` |
| Kexcelled | `THE K5 PETG` | Gold | `c9a227` |
| Kexcelled | `THE K5 PETG` | Blue | `1c50a0` |
| Kexcelled | `THE K5 PETG` | Green | `1e8449` |
| Kexcelled | `THE K5 PETG` | Silver | `c0c0c4` |
| Kexcelled | `THE K5 PETG` | Purple | `7b3fa0` |
| Kexcelled | `THE K5 PETG` | Natural | `e8e0d0` |
| Kexcelled | `THE K5 ABS` | Black | `000000` |
| Kexcelled | `THE K5 ABS` | Yellow | `f2c300` |
| Kexcelled | `THE K5 ABS` | Gold | `c9a227` |
| Kexcelled | `THE K5 ABS` | Silver | `c0c0c4` |
| Kexcelled | `THE K5 ABS` | Natural | `e8e0d0` |
| Kexcelled | `THE K5 ABS` | White | `ffffff` |
| Kexcelled | `THE K5 ABS` | Pink | `e8739f` |
| Kexcelled | `THE K5 ABS` | Gray | `808285` |
| Kexcelled | `THE K5 ABS` | Brown | `6b4226` |
| Kexcelled | `THE K5 ABS` | Blue | `1c50a0` |
| Kexcelled | `THE K5 ABS` | Red | `c8102e` |
| Kexcelled | `THE K5 ABS` | Purple | `7b3fa0` |
| Kexcelled | `THE K5 ABS` | Orange | `ef7622` |
| Kexcelled | `THE K5 ABS` | Green | `1e8449` |
| Kexcelled | `THE K5 ASA` | Orange | `ef7622` |
| Kexcelled | `THE K5 ASA` | Red | `c8102e` |
| Kexcelled | `THE K5 ASA` | Gray | `808285` |
| Kexcelled | `THE K5 ASA` | Blue | `1c50a0` |
| Kexcelled | `THE K5 ASA` | Green | `1e8449` |
| Kexcelled | `THE K5 ASA` | Natural | `e8e0d0` |
| Kexcelled | `THE K5 ASA` | Black | `000000` |
| Kexcelled | `THE K5 ASA` | White | `ffffff` |
| Kimya | `PLA-R` | White | `ffffff` |
| Kimya | `PLA-R` | Red | `c8102e` |
| Kimya | `Tough PLA-HI` | White | `ffffff` |
| Kimya | `ABS-R` | Black | `000000` |
| Kimya | `ABS-S` | White | `ffffff` |
| Kimya | `PETG-S` | Black | `000000` |
| Kimya | `PETG-S` | White | `ffffff` |
| Kimya | `PETG-R` | White | `ffffff` |
| Kimya | `PETG Carbon` | Black | `000000` |
| Kimya | `ASA-S` | Natural | `e8e0d0` |
| Kimya | `PC-S` | Transparent | `f5f5f5cc` |
| Kimya | `PA6-CO` | Black | `000000` |
| Kimya | `TPU-92A` | Red | `c8102e` |
| Kimya | `TPU-92A` | White | `ffffff` |
| Kimya | `TPU-R` | Transparent | `f5f5f5cc` |
| Kimya | `PEI Support` | Natural | `e8e0d0` |
| Kimya | `PPSU-S` | Natural | `e8e0d0` |
| Kingroon | `PETG Basic` | Black | `000000` |
| Kingroon | `PETG Basic` | White | `ffffff` |
| Kingroon | `PETG Basic` | Gray | `808285` |
| Kingroon | `PETG Basic` | Red | `c8102e` |
| Kingroon | `PETG Basic` | Blue | `1c50a0` |
| Kingroon | `PETG Basic` | Yellow | `f2c300` |
| Kingroon | `PETG Basic` | Green | `1e8449` |
| Kingroon | `PETG Basic` | Orange | `ef7622` |
| Kingroon | `PETG Basic` | Silver | `c0c0c4` |
| Kingroon | `PETG Basic` | Pink | `e8739f` |
| Kingroon | `PETG Basic` | Transparent | `f5f5f5cc` |
| Kingroon | `PETG Basic` | Purple | `7b3fa0` |
| Kingroon | `PETG Basic` | Brown | `6b4226` |
| Kingroon | `PLA PLUS` | Blue | `1c50a0` |
| Kingroon | `PLA PLUS` | White | `ffffff` |
| Kingroon | `PLA PLUS` | Black | `000000` |
| Kingroon | `PLA PLUS` | Grey | `808285` |
| Kingroon | `PLA PLUS` | Red | `c8102e` |
| Kingroon | `TPU` | Black | `000000` |
| Kingroon | `TPU` | White | `ffffff` |
| Kingroon | `TPU` | Blue | `1c50a0` |
| Kingroon | `TPU` | Red | `c8102e` |
| Kingroon | `TPU` | Green | `1e8449` |
| Kingroon | `ABS (FRESH)` | White | `ffffff` |
| Kingroon | `ABS (FRESH)` | Black | `000000` |
| Kingroon | `ABS (FRESH)` | Gray | `808285` |
| MatterHackers | `MH Build Series PLA` | Black | `000000` |
| MatterHackers | `MH Build Series PLA` | White | `ffffff` |
| MatterHackers | `MH Build Series ABS` | Black | `000000` |
| MatterHackers | `MH Build Series ABS` | White | `ffffff` |
| MatterHackers | `MH Build Series ABS` | Pink | `e8739f` |
| MatterHackers | `MH Build Series ABS` | Red | `c8102e` |
| MatterHackers | `MH Build Series ABS` | Orange | `ef7622` |
| MatterHackers | `MH Build Series ABS` | Yellow | `f2c300` |
| MatterHackers | `MH Build Series ABS` | Green | `1e8449` |
| MatterHackers | `PRO Series PLA` | Black | `000000` |
| MatterHackers | `PRO Series PLA` | Blue | `1c50a0` |
| MatterHackers | `PRO Series PLA` | Brown | `6b4226` |
| MatterHackers | `PRO Series PLA` | Clear | `f5f5f5cc` |
| MatterHackers | `PRO Series PLA` | Gold | `c9a227` |
| MatterHackers | `PRO Series PLA` | Gray | `808285` |
| MatterHackers | `PRO Series PLA` | Green | `1e8449` |
| MatterHackers | `PRO Series PLA` | Natural | `e8e0d0` |
| MatterHackers | `PRO Series PLA` | Orange | `ef7622` |
| MatterHackers | `PRO Series PLA` | Pink | `e8739f` |
| MatterHackers | `PRO Series PLA` | Purple | `7b3fa0` |
| MatterHackers | `PRO Series PLA` | Red | `c8102e` |
| MatterHackers | `PRO Series PLA` | Silver | `c0c0c4` |
| MatterHackers | `PRO Series PLA` | White | `ffffff` |
| MatterHackers | `PRO Series PLA` | Yellow | `f2c300` |
| MatterHackers | `PRO Series ABS` | Black | `000000` |
| MatterHackers | `PRO Series ABS` | Blue | `1c50a0` |
| MatterHackers | `PRO Series ABS` | Brown | `6b4226` |
| MatterHackers | `PRO Series ABS` | Gold | `c9a227` |
| MatterHackers | `PRO Series ABS` | Gray | `808285` |
| MatterHackers | `PRO Series ABS` | Green | `1e8449` |
| MatterHackers | `PRO Series ABS` | Natural | `e8e0d0` |
| MatterHackers | `PRO Series ABS` | Orange | `ef7622` |
| MatterHackers | `PRO Series ABS` | Purple | `7b3fa0` |
| MatterHackers | `PRO Series ABS` | Red | `c8102e` |
| MatterHackers | `PRO Series ABS` | Silver | `c0c0c4` |
| MatterHackers | `PRO Series ABS` | White | `ffffff` |
| MatterHackers | `PRO Series ABS` | Yellow | `f2c300` |
| MatterHackers | `PRO Series PETG` | Black | `000000` |
| MatterHackers | `PRO Series PETG` | White | `ffffff` |
| MatterHackers | `PRO Series PETG` | Orange | `ef7622` |
| MatterHackers | `PRO Series PETG` | Red | `c8102e` |
| MatterHackers | `PRO Series PETG` | Blue | `1c50a0` |
| MatterHackers | `PRO Series PETG` | Natural | `e8e0d0` |
| MatterHackers | `NylonX` | Black | `000000` |
| Push Plastic | `PLA` | Black | `000000` |
| Push Plastic | `PLA` | Brown | `6b4226` |
| Push Plastic | `PLA` | Green | `1e8449` |
| Push Plastic | `PLA` | Natural | `e8e0d0` |
| Push Plastic | `PLA` | Orange | `ef7622` |
| Push Plastic | `PLA` | Pink | `e8739f` |
| Push Plastic | `PLA` | Purple | `7b3fa0` |
| Push Plastic | `PLA` | Red | `c8102e` |
| Push Plastic | `PLA` | White | `ffffff` |
| Push Plastic | `PLA` | Yellow | `f2c300` |
| Push Plastic | `High Heat+Tough PLA` | Black | `000000` |
| Push Plastic | `High Heat+Tough PLA` | Green | `1e8449` |
| Push Plastic | `High Heat+Tough PLA` | Natural | `e8e0d0` |
| Push Plastic | `High Heat+Tough PLA` | Red | `c8102e` |
| Push Plastic | `High Heat+Tough PLA` | White | `ffffff` |
| Push Plastic | `PETG` | Black | `000000` |
| Push Plastic | `PETG` | Green | `1e8449` |
| Push Plastic | `PETG` | Natural | `e8e0d0` |
| Push Plastic | `PETG` | Orange | `ef7622` |
| Push Plastic | `PETG` | Pink | `e8739f` |
| Push Plastic | `PETG` | Purple | `7b3fa0` |
| Push Plastic | `PETG` | Red | `c8102e` |
| Push Plastic | `PCTG` | Black | `000000` |
| Push Plastic | `PCTG` | Green | `1e8449` |
| Push Plastic | `PCTG` | Natural | `e8e0d0` |
| Push Plastic | `PCTG` | Orange | `ef7622` |
| Push Plastic | `PCTG` | Pink | `e8739f` |
| Push Plastic | `PCTG` | Purple | `7b3fa0` |
| Push Plastic | `PCTG` | Red | `c8102e` |
| Push Plastic | `PCTG` | White | `ffffff` |
| Push Plastic | `ABS` | Black | `000000` |
| Push Plastic | `ABS` | Brown | `6b4226` |
| Push Plastic | `ABS` | Green | `1e8449` |
| Push Plastic | `ABS` | Natural | `e8e0d0` |
| Push Plastic | `ABS` | Orange | `ef7622` |
| Push Plastic | `ABS` | Pink | `e8739f` |
| Push Plastic | `ABS` | Purple | `7b3fa0` |
| Push Plastic | `ABS` | Red | `c8102e` |
| Push Plastic | `ABS` | White | `ffffff` |
| Push Plastic | `ABS` | Yellow | `f2c300` |
| Push Plastic | `ASA` | Black | `000000` |
| Push Plastic | `ASA` | Green | `1e8449` |
| Push Plastic | `ASA` | Natural | `e8e0d0` |
| Push Plastic | `ASA` | White | `ffffff` |
| Push Plastic | `Nylon` | Black | `000000` |
| Push Plastic | `Nylon` | Natural | `e8e0d0` |
| Push Plastic | `Nylon` | White | `ffffff` |
| REAL | `PLA` | White | `ffffff` |
| REAL | `PLA` | Black | `000000` |
| REAL | `PLA` | Gray | `808285` |
| REAL | `PLA` | Red | `c8102e` |
| REAL | `PLA` | Silver | `c0c0c4` |
| REAL | `PLA` | Yellow | `f2c300` |
| REAL | `PLA` | Green | `1e8449` |
| REAL | `PETG` | Blue | `1c50a0` |
| REAL | `PETG` | Green | `1e8449` |
| REAL | `PETG` | Orange | `ef7622` |
| REAL | `PETG` | White | `ffffff` |
| REAL | `PETG` | Black | `000000` |
| REAL | `PETG` | Transparent | `f5f5f5cc` |
| REAL | `RealFlex TPU` | White | `ffffff` |
| REAL | `RealFlex TPU` | Blue | `1c50a0` |
| REAL | `RealFlex TPU` | Red | `c8102e` |
| REAL | `RealFlex TPU` | Black | `000000` |
| REAL | `PC-ABS` | White | `ffffff` |
| REAL | `PC-ABS` | Black | `000000` |
| Siraya Tech | `Peopoly Lancer PETG-CF HF` | Black | `000000` |
| taulman3D | `Nylon 645` | Black | `000000` |
| taulman3D | `Nylon 645` | Natural | `e8e0d0` |
| taulman3D | `Nylon 680` | Natural | `e8e0d0` |
| taulman3D | `Bridge` | Natural | `e8e0d0` |
| taulman3D | `Alloy 910` | Natural | `e8e0d0` |
| Village Plastics | `PLA` | Black | `000000` |
| Village Plastics | `PLA` | Green | `1e8449` |
| Village Plastics | `PLA` | Natural | `e8e0d0` |
| Village Plastics | `PLA` | Red | `c8102e` |
| Village Plastics | `PLA` | White | `ffffff` |
| Village Plastics | `PLA` | Yellow | `f2c300` |
| Village Plastics | `P-PLA` | Black | `000000` |
| Village Plastics | `P-PLA` | Blue | `1c50a0` |
| Village Plastics | `P-PLA` | White | `ffffff` |
| Village Plastics | `ABS` | Black | `000000` |
| Village Plastics | `ABS` | Blue | `1c50a0` |
| Village Plastics | `ABS` | Natural | `e8e0d0` |
| Village Plastics | `ABS` | White | `ffffff` |
| Village Plastics | `PETG` | Black | `000000` |
| Village Plastics | `PETG` | White | `ffffff` |
| Village Plastics | `PETG` | Clear | `f5f5f5cc` |
| COEX 3D | `PLA` | White | `ffffff` |
| COEX 3D | `PLA` | Natural | `e8e0d0` |
| COEX 3D | `PLA Prime` | Black | `000000` |
| COEX 3D | `PLA Prime` | White | `ffffff` |
| COEX 3D | `PLA Prime` | Natural | `e8e0d0` |
| COEX 3D | `PLA+SILK` | Gold | `c9a227` |
| COEX 3D | `PLA+SILK` | Silver | `c0c0c4` |
| COEX 3D | `PLA+SILK` | Natural | `e8e0d0` |
| COEX 3D | `ABS` | Black | `000000` |
| COEX 3D | `ASA Prime` | Black | `000000` |
| COEX 3D | `PETG` | Black | `000000` |
| COEX 3D | `PETG` | White | `ffffff` |
| COEX 3D | `PETG` | Natural | `e8e0d0` |
| COEX 3D | `PCTG Prime` | Black | `000000` |
| COEX 3D | `PCTG Prime` | White | `ffffff` |
| COEX 3D | `PCTG Prime` | Natural | `e8e0d0` |
| COEX 3D | `Flame Retardant ABS` | Black | `000000` |
| COEX 3D | `CoexFlex TPE 30D` | Black | `000000` |
| COEX 3D | `CoexFlex TPE 30D` | White | `ffffff` |
| COEX 3D | `CoexFlex TPE 30D` | Natural | `e8e0d0` |
| COEX 3D | `CoexNylex Unfilled Nylon` | Natural | `e8e0d0` |
| COEX 3D | `CoexNylex Unfilled Nylon` | White | `ffffff` |
| COEX 3D | `HIPS` | Natural | `e8e0d0` |
| MarsWork | `PLA Matte` | Black | `000000` |
| MarsWork | `PLA Matte` | Orange | `ef7622` |
| MarsWork | `PLA Matte` | Red | `c8102e` |
| MarsWork | `PLA Matte` | White | `ffffff` |
| MarsWork | `PLA Silk` | Gold | `c9a227` |
| MarsWork | `PLA Silk` | Silver | `c0c0c4` |
| MarsWork | `PLA Silk` | Blue | `1c50a0` |
| MarsWork | `PLA Silk` | Pink | `e8739f` |
| MarsWork | `PLA Silk` | Purple | `7b3fa0` |
| MarsWork | `PLA Silk` | White | `ffffff` |
| Yoline Lab | `TPU 85A` | Black | `000000` |
| Yoline Lab | `TPU 85A` | Transparent | `f5f5f5cc` |
| Yoline Lab | `TPU 90A` | Black | `000000` |
| Yoline Lab | `TPU 90A` | Gray | `808285` |
| Yoline Lab | `TPU 90A` | White | `ffffff` |
| Yoline Lab | `TPU 90A` | Transparent | `f5f5f5cc` |
| Yoline Lab | `TPU 90A` | Blue | `1c50a0` |
| Yoline Lab | `TPU 90A` | Green | `1e8449` |
| Yoline Lab | `TPU 90A` | Red | `c8102e` |
| Yoline Lab | `TPU 90A` | Yellow | `f2c300` |
| Yoline Lab | `TPU 95A` | Black | `000000` |
| Yoline Lab | `TPU 95A` | White | `ffffff` |
| Yoline Lab | `TPU 95A` | Transparent | `f5f5f5cc` |
| Yoline Lab | `TPU 98A` | Black | `000000` |
| Yoline Lab | `TPU 98A` | Yellow | `f2c300` |
| Yoline Lab | `TPU 98A` | Blue | `1c50a0` |
| Yoline Lab | `TPU 98A` | Orange | `ef7622` |
| Yoline Lab | `TPU 98A` | Gray | `808285` |
| Yoline Lab | `TPU 98A` | Red | `c8102e` |
| Yoline Lab | `TPU 98A` | Green | `1e8449` |
| Yoline Lab | `TPU 98A` | White | `ffffff` |
| Yoline Lab | `TPU 98A` | Purple | `7b3fa0` |
| Yoline Lab | `TPU 72D` | Gray | `808285` |
| Yoline Lab | `TPU 72D` | Black | `000000` |
| Yoline Lab | `TPU 72D` | White | `ffffff` |
| Yoline Lab | `TPU 75D` | Gray | `808285` |
| Yoline Lab | `TPU 75D` | Black | `000000` |
| Yoline Lab | `TPU 75D` | White | `ffffff` |
| Yoline Lab | `TPU 64D` | Gray | `808285` |
| Yoline Lab | `TPU 64D` | Black | `000000` |
| Yoline Lab | `TPU 64D` | White | `ffffff` |
| IEMAI 3D | `PEEK` | Nature | `e8e0d0` |
| IEMAI 3D | `PEKK` | Nature | `e8e0d0` |
| IEMAI 3D | `PEI 9085` | Nature | `e8e0d0` |
| IEMAI 3D | `PPS` | Black | `000000` |
| IEMAI 3D | `CF-PA12` | Black | `000000` |
| Jamg He | `PLA+` | Yellow | `f2c300` |
| Jamg He | `PLA+` | Green | `1e8449` |
| Jamg He | `PLA+` | Orange | `ef7622` |
| Jamg He | `PLA+` | Blue | `1c50a0` |
| Jamg He | `PLA+` | Grey | `808285` |
| Jamg He | `PLA+` | Black | `000000` |
| Jamg He | `PLA+` | White | `ffffff` |
| Jamg He | `PLA+` | Red | `c8102e` |
| Jamg He | `PLA+` | Silver | `c0c0c4` |
| Jamg He | `PETG` | Black | `000000` |
| Jamg He | `PETG` | Yellow | `f2c300` |
| Jamg He | `PETG` | Blue | `1c50a0` |
| Jamg He | `PETG` | White | `ffffff` |
| Jamg He | `PETG` | Silver | `c0c0c4` |
| Jamg He | `PETG` | Gray | `808285` |
| Jamg He | `PETG` | Transparent | `f5f5f5cc` |
| Jamg He | `PETG` | Green | `1e8449` |
| Jamg He | `PETG` | Orange | `ef7622` |
| Jamg He | `PETG` | Purple | `7b3fa0` |
| Jamg He | `ABS` | Black | `000000` |
| Jamg He | `ABS` | White | `ffffff` |
| Jamg He | `ABS` | Grey | `808285` |
| Jamg He | `ABS` | Blue | `1c50a0` |
| Jamg He | `ABS` | Red | `c8102e` |
| Jamg He | `ABS` | Green | `1e8449` |
| Jamg He | `Silk PLA` | Purple | `7b3fa0` |
| Jamg He | `95A TPU` | Black | `000000` |
| Jamg He | `95A TPU` | White | `ffffff` |
| Jamg He | `95A TPU` | Grey | `808285` |
| Jamg He | `95A TPU` | Transparent | `f5f5f5cc` |
| Landu | `PLA+` | Black | `000000` |
| Landu | `PLA+` | White | `ffffff` |
| Landu | `PLA+` | Orange | `ef7622` |
| Landu | `PLA+` | Pink | `e8739f` |
| Landu | `PLA+` | Silver | `c0c0c4` |
| Landu | `PLA+` | Purple | `7b3fa0` |
| Landu | `PLA+` | Brown | `6b4226` |
| Landu | `PLA+` | Red | `c8102e` |
| Landu | `PLA+` | Yellow | `f2c300` |
| Landu | `PLA+` | Blue | `1c50a0` |
| Landu | `PLA+` | Green | `1e8449` |
| Landu | `PLA+` | Gray | `808285` |
| Landu | `PETG` | Black | `000000` |
| Landu | `PETG` | White | `ffffff` |
| Landu | `PETG` | Red | `c8102e` |
| Landu | `PETG` | Gray | `808285` |
| Landu | `PETG` | Transparent | `f5f5f5cc` |
| Landu | `ABS` | Black | `000000` |
| Landu | `ABS` | Gray | `808285` |
| Landu | `ABS` | Blue | `1c50a0` |
| Landu | `ABS` | Red | `c8102e` |
| Landu | `ABS` | Gold | `c9a227` |
| Landu | `ABS` | Pink | `e8739f` |
| Landu | `ABS` | White | `ffffff` |
| Landu | `ABS` | Silver | `c0c0c4` |
| Landu | `ABS` | Orange | `ef7622` |
| Landu | `ABS` | Purple | `7b3fa0` |
| Landu | `Hyper TPU 95A` | Black | `000000` |
| Landu | `Hyper TPU 95A` | White | `ffffff` |
| Landu | `Hyper TPU 95A` | Red | `c8102e` |
| Landu | `Hyper TPU 95A` | Blue | `1c50a0` |
| Landu | `Hyper TPU 95A` | Transparent | `f5f5f5cc` |
| Landu | `Carbon Fiber PLA` | Black | `000000` |
| Landu | `Carbon Fiber PLA` | Blue | `1c50a0` |
| Landu | `Carbon Fiber PLA` | Brown | `6b4226` |
| Landu | `Carbon Fiber PLA` | Green | `1e8449` |
| Landu | `Carbon Fiber PLA` | Purple | `7b3fa0` |
| Landu | `Carbon Fiber PLA` | Red | `c8102e` |

Published hexes taken from the manufacturer, **not** approximated:

| Brand | Line | Color | Hex | Source |
|---|---|---|---|---|
| COEX 3D | `{color_name}` (PLA) | Black | `000000` | coex3d.com product page |
| COEX 3D | `Carbon Filled {color_name}` | Black | `000000` | coex3d.com product page |
| COEX 3D | `SILK {color_name}` | Lipstick Pink | `e0457b` | coex3d.com product page |

## 3. Generic-density substitutions

The manufacturer publishes no density for these lines. The value is taken from
SpoolmanDB's own `materials.json` generic entry for that material - the project's
documented fallback data, not an invented number. A reviewer should still replace
each with a manufacturer figure where one exists.

**81 of 111 entries (72%) use a generic density.**

| Brand | Line (`name`) | Material | Density used | `materials.json` entry |
|---|---|---|---|---|
| Amolen | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Amolen | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| Amolen | `{color_name}` | TPU-95A | 1.21 | Flexible (TPU) 1.21 |
| Atomic Filament | `{color_name}` | PLA | 1.24 | PLA 1.24 |
| Atomic Filament | `MeltMiser {color_name}` | PLA | 1.24 | PLA 1.24 |
| Atomic Filament | `Hi-Flow Pro {color_name}` | PLA | 1.24 | PLA 1.24 |
| Atomic Filament | `PRO {color_name}` | PETG | 1.27 | PETG 1.27 |
| Atomic Filament | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Atomic Filament | `Flame Retardant {color_name}` | ABS | 1.04 | ABS 1.04 |
| Atomic Filament | `{color_name}` | ASA | 1.05 | ASA 1.05 |
| Atomic Filament | `{color_name}` | ASA-CF | 1.3 | Carbon Fiber 1.3 |
| Atomic Filament | `Nuclear Nylon v3 {color_name}` | PA-CF | 1.3 | Carbon Fiber 1.3 |
| Cookiecad | `Solid {color_name}` | PLA | 1.24 | PLA 1.24 |
| Filament PM | `{color_name}` | ABS-T | 1.08 | ABS-T 1.08 |
| Filament PM | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| Filamentive | `{color_name}` | PLA | 1.24 | PLA 1.24 |
| Filamentive | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| Filamentive | `{color_name}` | TPU-90A | 1.21 | Flexible (TPU) 1.21 |
| Filamentive | `rPA12 {color_name}` | PA | 1.52 | Nylon 1.52 |
| Ultrafuse | `{color_name}` | PLA | 1.24 | PLA 1.24 |
| IC3D | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| IC3D | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| IIID Max | `High Speed {color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| IIID Max | `High Speed {color_name}` | PETG | 1.27 | PETG 1.27 |
| IIID Max | `High Speed {color_name}` | TPU-95A | 1.21 | Flexible (TPU) 1.21 |
| IIID Max | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Kimya | `PLA-R {color_name}` | PLA | 1.24 | PLA 1.24 |
| Kimya | `Tough PLA-HI {color_name}` | PLA | 1.24 | PLA 1.24 |
| Kimya | `ABS-R {color_name}` | ABS | 1.04 | ABS 1.04 |
| Kimya | `ABS-S {color_name}` | ABS | 1.04 | ABS 1.04 |
| Kimya | `PETG-S {color_name}` | PETG | 1.27 | PETG 1.27 |
| Kimya | `PETG-R {color_name}` | PETG | 1.27 | PETG 1.27 |
| Kimya | `PETG Carbon {color_name}` | PETG-CF | 1.3 | Carbon Fiber 1.3 |
| Kimya | `ASA-S {color_name}` | ASA | 1.05 | ASA 1.05 |
| Kimya | `PC-S {color_name}` | PC | 1.3 | Polycarbonate (PC) 1.3 |
| Kimya | `PA6-CO {color_name}` | PA6 | 1.52 | Nylon 1.52 |
| Kimya | `{color_name}` | TPU-92A | 1.21 | Flexible (TPU) 1.21 |
| Kimya | `TPU-R {color_name}` | TPU | 1.21 | Flexible (TPU) 1.21 |
| Kimya | `PEI Support {color_name}` | PEI | 1.27 | PEI (Ultem) 1.27 |
| Kimya | `PPSU-S {color_name}` | PPSU | 1.37 | PPSU 1.37 |
| Kingroon | `PLUS {color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| Kingroon | `{color_name}` | TPU-95A | 1.21 | Flexible (TPU) 1.21 |
| Kingroon | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| MatterHackers | `MH Build Series {color_name}` | PLA | 1.24 | PLA 1.24 |
| MatterHackers | `MH Build Series {color_name}` | ABS | 1.04 | ABS 1.04 |
| MatterHackers | `NylonX {color_name}` | PA-CF | 1.3 | Carbon Fiber 1.3 |
| Push Plastic | `{color_name}` | PLA | 1.24 | PLA 1.24 |
| Push Plastic | `High Heat+Tough {color_name}` | PLA | 1.24 | PLA 1.24 |
| Push Plastic | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| Push Plastic | `{color_name}` | PCTG | 1.21 | PCTG 1.21 |
| Push Plastic | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Push Plastic | `{color_name}` | ASA | 1.05 | ASA 1.05 |
| Push Plastic | `{color_name}` | PA | 1.52 | Nylon 1.52 |
| REAL | `{color_name}` | PLA | 1.24 | PLA 1.24 |
| REAL | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| REAL | `RealFlex {color_name}` | TPU | 1.21 | Flexible (TPU) 1.21 |
| REAL | `{color_name}` | PC+ABS | 1.19 | PC/ABS 1.19 |
| Siraya Tech | `Peopoly Lancer HF {color_name}` | PET-CF | 1.3 | Carbon Fiber 1.3 |
| taulman3D | `Nylon 645 {color_name}` | PA | 1.52 | Nylon 1.52 |
| taulman3D | `Nylon 680 {color_name}` | PA | 1.52 | Nylon 1.52 |
| taulman3D | `Bridge {color_name}` | PA | 1.52 | Nylon 1.52 |
| taulman3D | `Alloy 910 {color_name}` | PA | 1.52 | Nylon 1.52 |
| Village Plastics | `{color_name}` | PLA | 1.24 | PLA 1.24 |
| Village Plastics | `P-PLA {color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| Village Plastics | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Village Plastics | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| COEX 3D | `SILK {color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| MarsWork | `Matte {color_name}` | PLA | 1.24 | PLA 1.24 |
| MarsWork | `Silk {color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| Yoline Lab | `{color_name}` | TPU-75D | 1.21 | Flexible (TPU) 1.21 |
| Yoline Lab | `{color_name}` | TPU-64D | 1.21 | Flexible (TPU) 1.21 |
| Jamg He | `{color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| Jamg He | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| Jamg He | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Jamg He | `Silk {color_name}` | PLA | 1.24 | PLA 1.24 |
| Jamg He | `{color_name}` | TPU-95A | 1.21 | Flexible (TPU) 1.21 |
| Landu | `{color_name}` | PLA+ | 1.24 | PLA+ 1.24 |
| Landu | `{color_name}` | PETG | 1.27 | PETG 1.27 |
| Landu | `{color_name}` | ABS | 1.04 | ABS 1.04 |
| Landu | `Hyper {color_name}` | TPU-95A | 1.21 | Flexible (TPU) 1.21 |
| Landu | `{color_name}` | PLA-CF | 1.3 | Carbon Fiber 1.3 |

Note: `-CF` materials fall back to the generic `Carbon Fiber` entry (1.3), which
is why `ASA-CF` at 1.3 trips a lint density-band warning. That is the fallback
working as documented, not a data error, but it is a prime candidate for replacement.

## 4. Skipped lines and brands

### 4a. Brands with no file at all

| Brand | Reason |
|---|---|
| igus | iglidur I150/I180 are tribo-polymers with an undisclosed base polymer; no SpoolmanDB material and no materials.json density maps. Skipped entirely, as instructed. |
| Voxelab | excluded upstream: voxelab3dp.com unreachable (expired TLS certificate), no manufacturer source for the current lineup. |
| Hobby Lobby | excluded upstream: no 3D filament category or own-brand filament on hobbylobby.com. |
| CHCKX3D | excluded upstream: chckx3d.com unreachable across attempts, likely defunct. |
| colorFabb | TDS give density and temps for 8 lines but the JS storefront exposed no color names at all, so every line loses all colors. |
| Duramic 3D | TDS give density and temps for 4 lines but no line has an enumerated color list. |
| NinjaTek | every color is a branded name (Midnight Black, Snow White, Steel Gray, Fire Red, Lava Orange, Sun Yellow, Grass Green, Sapphire Blue, Flamingo Pink, Neon Glow, Water Translucent) with no published hex. |
| OVV3D | no manufacturer site; every color is a multi-color marketing name (Tri Silk Sky Blue/Green/Rose Red, Rainbow Macaron Matte) with no published hex. |
| UltiMaker | colors are rendered as swatch images only, with neither names nor hex in the page text. |
| Comgrow | reseller-first catalog: the one line with colors has no published spool weight, and the lines with weights have no colors. |

### 4b. Lines skipped inside a brand that was written

| Brand | Line | Reason |
|---|---|---|
| Amolen | PLA Basic / PLA Silk / PLA Matte | collection pages list only branded color names (Peach Fuzz, Real Gold, ...) with no published hex |
| Amolen | PEBA Basic | no weight, no colors published |
| Atomic Filament | Translucent PLA / Silky PLA / Carbon Fiber Ultra Black ABS | all colors are branded names (Sapphire Blue, Offshore Mist, Ultra Black) with no published hex |
| Cookiecad | Silk PLA | colors are branded names (Unicorn, Mermaid, Witchcraft, Star Dust) with no published hex |
| Cookiecad | Glitter PLA | colors are branded names (Unicorn, Mermaid, Witchcraft, Star Dust) with no published hex |
| Cookiecad | Elixir (color-change) PLA | colors are branded names (Unicorn, Mermaid, Witchcraft, Star Dust) with no published hex |
| Cookiecad | Gradient/Ombre PLA | colors are branded names (Unicorn, Mermaid, Witchcraft, Star Dust) with no published hex |
| Cookiecad | Chip (marble) PLA | colors are branded names (Unicorn, Mermaid, Witchcraft, Star Dust) with no published hex |
| Cookiecad | Dual PLA | colors are branded names (Unicorn, Mermaid, Witchcraft, Star Dust) with no published hex |
| Filament PM | PLA / PLA+ / SILK / ASA / TPU 96 | no color list published on the category pages |
| Filament PM | PA-GFjet | PA-GF (30% glass fiber) has no published density and materials.json has no glass-fiber generic |
| Filamentive | ReFill PLA / TPU 98A / ASA / Carbon Fibre PETg | no color list published |
| Ultrafuse | PLA PRO1 / PLA Tough / PET / ABS / ABS Fusion+ / ASA / PP / PC-ABS FR / TPU 85A / 95A / 64D | TDS gated behind registration; no colors and no densities retrieved |
| Ultrafuse | Ultrafuse 316L / 17-4 PH | metal-filled (~90% metal, debind+sinter); no SpoolmanDB material or density maps |
| IC3D | Impact Modified PLA / Matte IM PLA / Recycled PETG / Matte Recycled PETG / PolyHex / Carbon Fiber PETG / UV-PETG | no color lists published |
| IIID Max | High Speed Silk PLA+ / Glow in the Dark PLA+ | colors are branded (Silk Bronze-Orange, Neon Sky Blue) with no published hex |
| IIID Max | Carbon Fiber PLA+ / FiberX PETG+CF / FiberX PA6-66+CF15 | no published weight or no color list |
| Kexcelled | K5 specialty lines (Matte/PRO/Silk/Sparkle/WOOD/Metal/ColorChange/Magic), K6 PLA-CF/FG, K11/K12 PEEK/PEI | captured name-only; no per-line colors, densities or temps |
| Kimya | ABS-ESD / TPC-ESD | conductive (ESD) compounds: no published density and no materials.json generic |
| Kimya | ABS Kevlar | aramid-filled; 'ABS-Aramid' is not a valid SpoolmanDB material |
| Kimya | ABS-EC / ABS Carbon | duplicate of PETG/ABS carbon SKUs in the reseller data; ABS-CF density unpublished and ambiguous between the two SKUs |
| Kimya | TPC-91A | TPC has no materials.json generic density |
| Kimya | PEBA-S / PEI-9085 / PEKK Carbon | no diameters, weights or colors published |
| Kimya | HIPS-R | only color is 'Natural (Grey)', an ambiguous compound name with no hex |
| Kimya | PEI-1010 (Amber) / PEKK-SC (Beige) / PEKK-A | no basic color name or no color at all |
| Kingroon | PLA / PLA Refill / Matte PLA / Silk Tri-Color PLA / Rapid PLA | no color list published |
| Kingroon | PETG Carbon Fiber / Carbon Fiber PLA | no published spool weight |
| MatterHackers | NylonG | PA-GF: no published density and materials.json has no glass-fiber generic |
| Push Plastic | Carbon Fiber PETG / ABS / Nylon / PC+PBT, PMMA, TPU, PEI, HIPS, PC+PBT | no color list published; several are nav entries with no product-level specs |
| Push Plastic | 3 kg / 5 kg / 10 kg / 25 kg formats | listed site-wide but not confirmed per color; only the sourced 1 kg SKU is included |
| REAL | PLA Glow in the Dark | single color 'Glow in the Dark' has no published hex |
| Siraya Tech | Flex TPU 85A/95A/64D/Air, Roamr, Rebound PEBA, Fibreheart PET-CF/PET-GF/PPA family, ABS-GF/CF, ASA-GF | no color lists published anywhere in the capture; the whole catalog is colorless in the research data |
| taulman3D | t-glase | PETT has no materials.json generic density |
| COEX 3D | ESD PETG / CoexFlex TPE 40D / 60D | no published weight |
| COEX 3D | CoexFlex TPE 90A | no published density and materials.json has no TPE 90A generic |
| MarsWork | PLA Basic | no published spool weight on the product page |
| IEMAI 3D | all lines | TDS PDFs publish mechanical/thermal data but no nozzle or bed temperature |
| Landu | PLA Basic | every published color is a branded name (Fire Engine Red, Rose Red, Golden, Mint Green) with no hex |

### 4c. Weight/diameter groupings trimmed

SpoolmanDB multiplies `weights` x `diameters` x `colors`, so a line is only
grouped when every combination is actually sold. Where the research listed a
site-wide set of spool sizes without confirming them per color, the entry was
cut back to the SKU that was actually sourced.

| Brand | Line | Trim |
|---|---|---|
| Filamentive | `{color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| Filamentive | `{color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| Kexcelled | `K5 {color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| Kexcelled | `K5 {color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| Kexcelled | `K5 {color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| MatterHackers | `PRO Series {color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| MatterHackers | `PRO Series {color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| Yoline Lab | `{color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |
| Yoline Lab | `{color_name}` | weights trimmed to [1000] (sourced SKU) to avoid unsold weight x diameter x color combinations |

### 4d. Caveats worth reading before any PR

- **taulman3D - low confidence.** `taulman3d.com` is domain-squatted as of
  2026-09-20. The brand survives as "Xtellar Taulman" at MatterHackers, and the
  645/680/Bridge/910 figures are historic TDS values that could not be
  re-verified against a live manufacturer source. Do not submit this file
  without a current primary source.
- **UltiMaker - swatch-only colors.** The S-series material pages render colors
  as images with neither a name nor a hex in the page text. Twelve lines with
  published weights and diameters are blocked purely on color data.
- **Ultrafuse 316L / 17-4 PH - metal-filled.** ~90% metal powder, debind-and-
  sinter workflow. No SpoolmanDB material term and no density maps; excluded.
- **igus - skipped entirely.** iglidur I150/I180 are tribo-polymers whose base
  polymer igus does not disclose. There is no honest `material` value, so no
  file was written even though density, temps, weights and colors are all
  published.
- **Voxelab, Hobby Lobby, CHCKX3D** were excluded upstream in research and were
  not reconsidered here.
- **REAL** data comes from the Dutch reseller filamentz.nl reproducing REAL's
  spec sheets; `real-filament.com` blocked retrieval. Verify against the
  manufacturer before submitting.
- **Siraya Tech**: the only entry that survives is `Peopoly Lancer HF`, a SKU
  Siraya Tech manufactures for the *Peopoly* brand. Filing it under the Siraya
  Tech manufacturer is arguably wrong; consider dropping this file entirely.
- **Kingroon / IIID Max / Amolen / Landu** carry a `{color_name}` per-line color
  set far smaller than the real catalog, because most of the catalog is sold
  under branded color names with no published hex.

## 5. SpoolmanDB contribution constraints - checklist

From `CONTRIBUTING.md`. **Every box below is currently unchecked.**

| # | Constraint | Status |
|---|---|---|
| 1 | **One manufacturer per PR.** 23 files here = 23 separate PRs, each touching exactly one file. | [ ] not done |
| 2 | **Sources linked in the PR description.** Per-brand list below. | [ ] paste into each PR |
| 3 | **No AI-generated data.** SpoolmanDB explicitly rejects densities, spool weights and hex codes filled in with plausible values. Every field here must be read off the linked source by a human before submission. | [ ] not verified |
| 4 | **`spool_weight` must be measured.** Put an empty spool on a kitchen scale. A rounded, copied or assumed number is worse than none. | [ ] not measured |
| 5 | **Check open PRs for the same manufacturer** before opening. | [x] done, see section 6 |
| 6 | Run `check-jsonschema`, `lint_filaments.py`, `compile_filaments.py`. | [x] all three run, see section 1 |
| 7 | Don't commit generated `filaments.json`, editor files, or schema/workflow changes. | [x] output is data files only |
| 8 | 4-space indent, consistent line endings. | [x] 4-space, LF |

### What "human-verified" means for this batch, concretely

1. Open each source URL in section 5's table and read the value off the page or TDS.
2. Replace or confirm all 81 generic densities (section 3).
3. Replace or confirm all 501 approximated hexes (section 2) against a
   published swatch code or a product photo.
4. Weigh an empty spool per weight/spool-type combination and fill in `spool_weight`.
   Until then the lint fails, and it is meant to.
5. Anything in section 4 stays out of the PR rather than being filled in from
   plausible values.

### Sources to paste into each PR description

**Amolen** (`filaments/amolen.json`)

- https://www.amolen.com/collections/abs-1-75mm-filament-1kg-spool
- https://www.amolen.com/collections/petg
- https://www.amolen.com/collections/tpu-filament

**Atomic Filament** (`filaments/atomicfilament.json`)

- https://atomicfilament.com/pages/atomic-filament-faq
- https://atomicfilament.com/products/black-pla-filament
- https://atomicfilament.com/products/deep-black-opaque-petg-pro

**COEX 3D** (`filaments/coex3d.json`)

- https://coex3d.com/pages/filament-parameters
- https://coex3d.com/products/black-pla

**Cookiecad** (`filaments/cookiecad.json`)

- https://cookiecad.com/shop

**Filamentive** (`filaments/filamentive.json`)

- https://www.filamentive.com/shop/

**Filament PM** (`filaments/filamentpm.json`)

- https://shop.filament-pm.com/abs-t
- https://shop.filament-pm.com/

**IC3D** (`filaments/ic3d.json`)

- https://www.ic3dprinters.com/shop/pla-filaments/
- https://www.ic3dprinters.com/ic3d/wp-content/uploads/2020/08/PETG-IC3D-TDS-2020.07.pdf
- https://www.ic3dprinters.com/ic3d/wp-content/uploads/2020/08/ABS-IC3D-TDS-2020.07.pdf
- https://www.ic3dprinters.com/tds-sds/

**IEMAI 3D** (`filaments/iemai3d.json`)

- https://www.iemai3d.com/index.php/3d-printing-filament/
- https://www.iemai3d.com/wp-content/uploads/2026/08/01_PEEK_TDS.pdf
- https://www.iemai3d.com/wp-content/uploads/2026/08/02_PEKK_TDS.pdf
- https://www.iemai3d.com/wp-content/uploads/2026/08/03_PEI_9085_TDS.pdf
- https://www.iemai3d.com/wp-content/uploads/2025/05/06_PPS-Filament-TDS.pdf
- https://www.iemai3d.com/wp-content/uploads/2026/08/11_CF-PA12-Filament-TDS.pdf

**IIID Max** (`filaments/iiidmax.json`)

- https://iiidmax.com/products/iiid-max-high-speed-pla
- https://iiidmax.com/collections/iiid-max-1

**Jamg He** (`filaments/jamghe.json`)

- https://www.jamghe.com/products/pla-plus-1-75mm-3d-printer-filament-1kg
- https://www.jamghe.com/collections/3d-printer-filament

**Kexcelled** (`filaments/kexcelled.json`)

- https://kexcelled3d.com/products/the-k5%E2%84%A2-pla
- https://kexcelled3d.com/collections/filaments

**Kimya** (`filaments/kimya.json`)

- https://www.kimya.fr/en/products-category/3d-filaments/
- https://www.crea3d.com/en/26_kimya
- https://b3d.com.au/DispCat.asp?CatID=17&SubCatID=177
- https://cimquest-inc.com/kimya-materials/

**Kingroon** (`filaments/kingroon.json`)

- https://kingroon.com/products/kingroon-petg-basic
- https://kingroon.com/collections/pla-filament
- https://kingroon.com/collections/tpu-filament
- https://kingroon.com/collections/abs-filament

**Landu** (`filaments/landu.json`)

- https://www.landustore.com/products/pla-basic-filament
- https://www.landustore.com/collections/all

**MarsWork** (`filaments/marswork.json`)

- https://www.marswork3d.com/products/pla-basic
- https://marswork3d.com

**MatterHackers** (`filaments/matterhackers.json`)

- https://www.matterhackers.com/store/c/mh-build-series-pla
- https://www.matterhackers.com/store/c/mh-build-series-abs
- https://www.matterhackers.com/store/c/175mm-pro-series-pla
- https://www.matterhackers.com/store/c/PRO%20Series%20ABS
- https://www.matterhackers.com/store/c/pro-series-petg
- https://www.matterhackers.com/store/c/NylonX

**Push Plastic** (`filaments/pushplastic.json`)

- https://www.pushplastic.com/products/pla-filament-1-75mm-1kg
- https://www.pushplastic.com/products/high-heat-tough-pla-filament-1-75mm-1kg
- https://www.pushplastic.com/products/petg-filament-1-75mm-1kg
- https://www.pushplastic.com/products/pctg-filament-1-75mm-1kg
- https://www.pushplastic.com/products/abs-filament-1-75mm-1kg
- https://www.pushplastic.com/products/asa-filament-1-75mm-1kg
- https://www.pushplastic.com/products/nylon-filament-1-75mm-1kg
- https://www.pushplastic.com/pages/filament-colors

**REAL** (`filaments/real.json`)

- https://filamentz.nl/en/products/real-pla-filament
- https://filamentz.nl/en/products/real-petg-filament
- https://filamentz.nl/en/products/real-tpu-1kg
- https://filamentz.nl/en/products/real-pcabs-1kg
- https://real-filament.com/

**Siraya Tech** (`filaments/sirayatech.json`)

- https://siraya.tech/collections/petg-cf-filament
- https://siraya.tech/collections/plastic-filament

**taulman3D** (`filaments/taulman3d.json`)

- https://www.matterhackers.com/store/c/3d-printer-filament/taulman-nylon

**Ultrafuse** (`filaments/ultrafuse.json`)

- https://forward-am.com/material-portfolio/ultrafuse-filaments-for-fused-filaments-fabrication-fff/standard-filaments/

**Village Plastics** (`filaments/villageplastics.json`)

- https://tonerplastics.com/product/village-plastics-pla-filament-reels/
- https://tonerplastics.com/shop-category/filament-reels/

**Yoline Lab** (`filaments/yolinelab.json`)

- https://yolinelab.com/products/tpu-85a
- https://yolinelab.com/collections/tpu

## 6. Correlation with open SpoolmanDB PRs

| PR | Manufacturer | Overlap with this batch |
|---|---|---|
| #478 | Snapmaker | None. Snapmaker was deliberately **not** authored here - a submission is already pending. |
| #479 | VANYO | None. VANYO is not in the 29-brand candidate set. |
| #480 | Prusament expansion | None. Prusament already exists in the repo and was used only as a style reference. |
| #481 | Sunlu glow | None. Sunlu is not in the 29-brand candidate set. |

**No collisions.** None of the 23 manufacturers written here, nor the 6 brands
skipped for data reasons, appear in the four open PRs. The duplicate check should
be re-run immediately before opening each PR, since SpoolmanDB notes duplicates
are common and the PR queue moves.

Also checked: none of the 23 manufacturers already has a file in `filaments/` on
the tracked branch of this clone (67 existing files), so all 23 are new
manufacturer additions rather than edits.
