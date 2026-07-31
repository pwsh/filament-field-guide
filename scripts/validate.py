#!/usr/bin/env python3
"""Validate all data files against schemas, check cross-references and derived
fields, and regenerate data/index.json. Exit non-zero on any failure.

Usage: python scripts/validate.py  (from repo root or scripts/)
Requires: pip install jsonschema
"""
import json
import sys
from datetime import date, datetime
from pathlib import Path

from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "schema"
DATA_DIR = ROOT / "data"
STALE_DAYS = 365

KINDS = {
    "filaments": "filament.schema.json",
    "manufacturers": "manufacturer.schema.json",
    "plates": "plate.schema.json",
}

errors: list[str] = []
warnings: list[str] = []


def load(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        errors.append(f"{path.relative_to(ROOT)}: invalid JSON — {e}")
        return None


def main() -> int:
    schemas = {name: load(SCHEMA_DIR / name) for name in set(KINDS.values()) | {"glossary.schema.json"}}
    if any(v is None for v in schemas.values()):
        report()
        return 1

    registry = Registry().with_resources(
        (name, Resource.from_contents(content)) for name, content in schemas.items()
    )

    def validator_for(schema_name: str) -> Draft202012Validator:
        return Draft202012Validator(schemas[schema_name], registry=registry)

    entities: dict[str, dict[str, dict]] = {k: {} for k in KINDS}

    # Validate entity files
    for kind, schema_name in KINDS.items():
        v = validator_for(schema_name)
        kind_dir = DATA_DIR / kind
        for path in sorted(kind_dir.glob("*.json")) if kind_dir.exists() else []:
            data = load(path)
            if data is None:
                continue
            for err in sorted(v.iter_errors(data), key=lambda e: list(e.path)):
                loc = "/".join(str(p) for p in err.path) or "<root>"
                errors.append(f"{path.relative_to(ROOT)}: {loc}: {err.message}")
            if isinstance(data, dict):
                if data.get("id") != path.stem:
                    errors.append(f"{path.relative_to(ROOT)}: id '{data.get('id')}' != filename '{path.stem}'")
                entities[kind][path.stem] = data

    # Glossary
    glossary = load(DATA_DIR / "glossary.json")
    glossary_keys: set[str] = set()
    if glossary is not None:
        for err in validator_for("glossary.schema.json").iter_errors(glossary):
            errors.append(f"data/glossary.json: {err.message}")
        glossary_keys = {e.get("key") for e in glossary.get("entries", []) if isinstance(e, dict)}

    fil_ids = set(entities["filaments"])
    plate_ids = set(entities["plates"])

    # Cross-references and derived fields
    for fid, f in entities["filaments"].items():
        src = f"data/filaments/{fid}.json"
        bt = f.get("base_type")
        if bt and bt not in fil_ids:
            errors.append(f"{src}: base_type '{bt}' not found")
        comp = f.get("compatibility", {})
        for field in ("bonds_with", "support_materials", "usable_as_support_for"):
            for ref in comp.get(field, []):
                if ref not in fil_ids:
                    warnings.append(f"{src}: compatibility.{field} references unknown filament '{ref}' (ok if pending research)")
        for rec in f.get("plate_recommendations", []):
            if rec.get("plate_id") not in plate_ids:
                warnings.append(f"{src}: plate_recommendations references unknown plate '{rec.get('plate_id')}'")
        props = f.get("properties", {})
        d = props.get("density_g_cm3")
        if d:
            g = props.get("grams_per_100cm3")
            c = props.get("cm3_per_100g")
            if g is not None and abs(g - d * 100) > 0.5:
                errors.append(f"{src}: grams_per_100cm3 {g} inconsistent with density {d} (expected {d*100:.1f})")
            if c is not None and abs(c - 100 / d) > 0.5:
                errors.append(f"{src}: cm3_per_100g {c} inconsistent with density {d} (expected {100/d:.1f})")

    for pid, p in entities["plates"].items():
        src = f"data/plates/{pid}.json"
        for rec in p.get("filament_compatibility", []):
            if rec.get("filament_id") not in fil_ids:
                warnings.append(f"{src}: filament_compatibility references unknown filament '{rec.get('filament_id')}'")

    # Staleness report
    today = date.today()
    for kind in KINDS:
        for eid, e in entities[kind].items():
            lv = e.get("provenance", {}).get("last_verified")
            if lv:
                try:
                    age = (today - datetime.strptime(lv, "%Y-%m-%d").date()).days
                    if age > STALE_DAYS:
                        warnings.append(f"data/{kind}/{eid}.json: stale — last_verified {lv} ({age} days ago)")
                except ValueError:
                    pass

    if not errors:
        index = {
            "generated_note": "GENERATED by scripts/validate.py — do not edit by hand",
            "counts": {k: len(v) for k, v in entities.items()},
            "filaments": [summary_fil(f) for _, f in sorted(entities["filaments"].items())],
            "manufacturers": [summary_min(m, "manufacturers") for _, m in sorted(entities["manufacturers"].items())],
            "plates": [summary_min(p, "plates") for _, p in sorted(entities["plates"].items())],
        }
        (DATA_DIR / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
        print(f"Regenerated data/index.json ({index['counts']})")

    report()
    return 1 if errors else 0


def summary_fil(f: dict) -> dict:
    """Card/filter payload so the table view loads one file."""
    keep = ["id", "name", "aliases", "status", "base_type", "variation_kind", "polymer_class",
            "summary", "suitability", "scores", "price", "use_cases"]
    out = {k: f[k] for k in keep if k in f}
    em = f.get("emissions", {})
    if em:
        out["emissions"] = {k: em[k] for k in ("ventilation", "voc_level") if k in em}
    pr = f.get("printing", {})
    out["enclosure_recommended"] = pr.get("enclosure_recommended")
    out["heated_chamber_required"] = pr.get("heated_chamber_required")
    out["confidence"] = f.get("provenance", {}).get("confidence")
    return out


def summary_min(e: dict, kind: str) -> dict:
    keep = ["id", "name", "status", "summary"]
    out = {k: e[k] for k in keep if k in e}
    if kind == "manufacturers":
        out["brands"] = e.get("brands", [])
        out["manufacturing_countries"] = e.get("manufacturing_countries", [])
        out["price_tier"] = e.get("price_tier")
        out["makes_plates"] = e.get("makes_plates")
    else:
        out["texture"] = e.get("texture")
        out["surface_makeup"] = e.get("surface_makeup")
    out["confidence"] = e.get("provenance", {}).get("confidence")
    return out


def report() -> None:
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")


if __name__ == "__main__":
    sys.exit(main())
