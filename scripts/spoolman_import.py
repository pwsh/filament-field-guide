#!/usr/bin/env python3
"""Import Filament Field Guide SpoolmanDB candidates into a Spoolman instance.

Populates a Spoolman server with the vendors/filaments that Spoolman's native
external database (SpoolmanDB) does not carry, reading the candidate files in
``research/spoolmandb-contributions/filaments/*.json``.

One Spoolman filament is created per (product line x color). Runs are
idempotent: an existing filament with the same name + material under the same
vendor is skipped, so re-running is safe.

Usage:
    # dry run (default) -- prints exactly what would be created
    python3 scripts/spoolman_import.py --url https://spoolman.holzhueter.us

    # only certain brands (matched against the candidate file stem)
    python3 scripts/spoolman_import.py --url http://spoolman.local:7912 \\
        --brands amolen,insignia

    # actually create the vendors/filaments (owner's LAN one-liner)
    python3 scripts/spoolman_import.py --url https://spoolman.holzhueter.us --apply

    # self-signed internal certificate
    python3 scripts/spoolman_import.py --url https://spoolman.lan --insecure --apply

Stdlib only (urllib/json/argparse); no pip dependencies.
"""

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

CANDIDATE_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "research", "spoolmandb-contributions", "filaments",
)
COMMENT_BASE = (
    "Imported from Filament Field Guide SpoolmanDB candidates "
    "(research/spoolmandb-contributions). Hex may be approximate; verify. "
)
VENDOR_COMMENT = (
    "Added by Filament Field Guide import 2026-09-20 "
    "(not in SpoolmanDB upstream)."
)


class ApiError(Exception):
    pass


def api(base, path, method="GET", payload=None, timeout=15, ctx=None):
    url = base.rstrip("/") + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            body = resp.read().decode("utf-8", "replace")
            return json.loads(body) if body.strip() else None
    except urllib.error.HTTPError as exc:
        snippet = exc.read().decode("utf-8", "replace")[:300]
        raise ApiError("HTTP %s %s %s -- %s" % (exc.code, method, path, snippet))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise ApiError("%s %s -- %s" % (method, path, exc))


def fetch_all(base, path, timeout, ctx):
    """GET a list endpoint, following offset pagination until a short page."""
    out, offset, limit = [], 0, 1000
    while True:
        sep = "&" if "?" in path else "?"
        page = api(base, "%s%slimit=%d&offset=%d" % (path, sep, limit, offset),
                   timeout=timeout, ctx=ctx) or []
        if isinstance(page, dict):  # some builds wrap results
            page = page.get("items", [])
        out.extend(page)
        if len(page) < limit:
            return out
        offset += limit


def temp(value, rng):
    if isinstance(value, (int, float)):
        return int(round(value)), False
    if isinstance(rng, (list, tuple)) and len(rng) == 2:
        return int(round((rng[0] + rng[1]) / 2.0)), True
    return None, False


def expand(doc):
    """Yield one Spoolman filament payload (minus vendor_id) per line x color."""
    for line in doc.get("filaments", []):
        weights = line.get("weights") or [{}]
        chosen = next((w for w in weights if w.get("weight") == 1000), weights[0])
        ext, ext_rng = temp(line.get("extruder_temp"), line.get("extruder_temp_range"))
        bed, bed_rng = temp(line.get("bed_temp"), line.get("bed_temp_range"))
        note = ""
        if ext_rng or bed_rng:
            bits = []
            if ext_rng:
                bits.append("extruder %s-%s C" % tuple(line["extruder_temp_range"]))
            if bed_rng:
                bits.append("bed %s-%s C" % tuple(line["bed_temp_range"]))
            note = "Source gives a range (%s); midpoint stored." % "; ".join(bits)
        for color in line.get("colors", []):
            name = line.get("name", "{color_name}")
            name = name.replace("{color_name}", color.get("name", "")).strip()
            payload = {
                "name": name or color.get("name", ""),
                "material": line.get("material"),
                "density": float(line.get("density", 0)),
                "diameter": float((line.get("diameters") or [1.75])[0]),
                "weight": float(chosen.get("weight", 1000)),
                "comment": (COMMENT_BASE + note).strip(),
            }
            if chosen.get("spool_weight") is not None:
                payload["spool_weight"] = float(chosen["spool_weight"])
            hexval = (color.get("hex") or "").lstrip("#").lower()
            if len(hexval) >= 6:
                payload["color_hex"] = hexval[:6]
            if ext is not None:
                payload["settings_extruder_temp"] = ext
            if bed is not None:
                payload["settings_bed_temp"] = bed
            yield payload


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--url", required=True, help="Spoolman base URL")
    ap.add_argument("--apply", action="store_true", help="perform POSTs (default: dry run)")
    ap.add_argument("--brands", help="comma-separated candidate file stems to limit to")
    ap.add_argument("--timeout", type=float, default=15)
    ap.add_argument("--insecure", action="store_true", help="disable TLS verification")
    ap.add_argument("--dir", default=CANDIDATE_DIR, help="candidate filaments directory")
    args = ap.parse_args()

    ctx = None
    if args.insecure:
        print("WARNING: TLS certificate verification disabled (--insecure).")
        ctx = ssl._create_unverified_context()

    mode = "APPLY" if args.apply else "DRY RUN"
    try:
        info = api(args.url, "/api/v1/info", timeout=args.timeout, ctx=ctx)
    except ApiError as exc:
        print("Cannot reach Spoolman at %s: %s" % (args.url, exc))
        return 1
    print("Connected to Spoolman %s [%s]" % (info.get("version", "?"), mode))

    only = {b.strip().lower() for b in args.brands.split(",")} if args.brands else None
    files = sorted(f for f in os.listdir(args.dir) if f.endswith(".json"))
    files = [f for f in files if only is None or f[:-5].lower() in only]

    try:
        vendors = fetch_all(args.url, "/api/v1/vendor", args.timeout, ctx)
        existing_f = fetch_all(args.url, "/api/v1/filament", args.timeout, ctx)
    except ApiError as exc:
        print("Cannot list existing data: %s" % exc)
        return 1
    vendor_ids = {v["name"].strip().lower(): v["id"] for v in vendors}
    have = {(str((f.get("vendor") or {}).get("id")),
             (f.get("name") or "").strip().lower(),
             (f.get("material") or "").strip().lower()) for f in existing_f}

    vc = vs = fc = fs = ff = 0
    sample_shown = False
    for fname in files:
        with open(os.path.join(args.dir, fname)) as fh:
            doc = json.load(fh)
        vendor = doc.get("manufacturer", "").strip()
        key = vendor.lower()
        vid = vendor_ids.get(key)
        if vid is not None:
            print("SKIP vendor  %s (exists, id=%s)" % (vendor, vid))
            vs += 1
        elif args.apply:
            try:
                created = api(args.url, "/api/v1/vendor", "POST",
                              {"name": vendor, "comment": VENDOR_COMMENT},
                              args.timeout, ctx)
                vid = created["id"]
                vendor_ids[key] = vid
                print("CREATE vendor %s (id=%s)" % (vendor, vid))
                vc += 1
            except ApiError as exc:
                print("FAIL vendor  %s: %s" % (vendor, exc))
                ff += 1
                continue
        else:
            print("CREATE vendor %s" % vendor)
            vendor_ids[key] = None
            vc += 1

        for payload in expand(doc):
            sig = (str(vid), payload["name"].strip().lower(),
                   (payload["material"] or "").strip().lower())
            if sig in have:
                print("  SKIP   %s / %s (%s)" % (vendor, payload["name"], payload["material"]))
                fs += 1
                continue
            if not sample_shown:
                print("  sample payload: %s" % json.dumps(dict(payload, vendor_id=vid)))
                sample_shown = True
            if not args.apply:
                print("  CREATE %s / %s (%s, %.2fmm, %.0fg, #%s)" % (
                    vendor, payload["name"], payload["material"], payload["diameter"],
                    payload["weight"], payload.get("color_hex", "------")))
                fc += 1
                continue
            try:
                api(args.url, "/api/v1/filament", "POST",
                    dict(payload, vendor_id=vid), args.timeout, ctx)
                print("  CREATE %s / %s (%s)" % (vendor, payload["name"], payload["material"]))
                have.add(sig)
                fc += 1
            except ApiError as exc:
                print("  FAIL   %s / %s: %s" % (vendor, payload["name"], exc))
                ff += 1

    print("\n%s summary: vendors created=%d skipped=%d | filaments created=%d "
          "skipped=%d failed=%d" % (mode, vc, vs, fc, fs, ff))
    return 1 if ff else 0


if __name__ == "__main__":
    sys.exit(main())
