#!/usr/bin/env python3
"""Import Filament Field Guide SpoolmanDB candidates into a Spoolman instance.

Populates a Spoolman server with the vendors/filaments that Spoolman's native
external database (SpoolmanDB) does not carry, reading the candidate files in
``research/spoolmandb-contributions/filaments/*.json``.

One Spoolman filament is created per (product line x color). Runs are
idempotent: an existing filament with the same name + material under the same
vendor is skipped, so re-running is safe. With --update, such an existing
filament is instead diffed against the would-be payload and PATCHed with only
the fields whose values changed.

``--url`` takes a plain ``http://`` or a ``https://`` base; most Spoolman
installs are plain http, so that is the example used throughout. The scheme is
used as given -- nothing is rewritten -- and ``--insecure`` only means anything
for https (it is ignored, with a note, for http).

``--pr`` additionally imports brands straight from open SpoolmanDB pull
requests, before they merge, via the GitHub API. Currently interesting: #478
(Snapmaker) and #479 (VANYO) add new brands; #480 (Prusament) and #481 (Sunlu)
update brands upstream already carries, and importing those creates local
duplicates of Spoolman's native external-database entries (a warning is
printed).

Usage:
    # dry run (default) -- prints exactly what would be created
    python3 scripts/spoolman_import.py --url http://spoolman.local:7912

    # only certain brands (matched against the candidate file stem)
    python3 scripts/spoolman_import.py --url http://spoolman.local:7912 \\
        --brands amolen,insignia

    # actually create the vendors/filaments
    python3 scripts/spoolman_import.py --url http://spoolman.local:7912 --apply

    # also push changed values onto filaments that already exist
    python3 scripts/spoolman_import.py --url http://spoolman.local:7912 \\
        --apply --update

    # pull two not-yet-merged SpoolmanDB pull requests in as well
    python3 scripts/spoolman_import.py --url http://spoolman.local:7912 \\
        --pr 478,479 --apply

    # https with a self-signed internal certificate
    python3 scripts/spoolman_import.py --url https://spoolman.example.internal \\
        --insecure --apply

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
PR_COMMENT_BASE = (
    "Imported from SpoolmanDB pull request #%s (not merged upstream at import "
    "time). Hex may be approximate; verify. "
)
SPOOLMANDB_REPO = "Donkie/SpoolmanDB"
# Overridable for offline testing against a stand-in GitHub API.
GITHUB_API = os.environ.get("SPOOLMAN_IMPORT_GITHUB_API", "https://api.github.com")
GITHUB_RAW = os.environ.get("SPOOLMAN_IMPORT_GITHUB_RAW",
                            "https://raw.githubusercontent.com")
USER_AGENT = "filament-field-guide-spoolman-import"
# Brands upstream SpoolmanDB already carries (filename stems, snapshot of
# 2026-09-20), used only to warn when a --pr brand duplicates one that
# Spoolman already serves from its native external database. Pass
# --spoolmandb-dir pointing at a live clone's filaments/ dir to use the
# current list instead of this snapshot.
UPSTREAM_BRANDS_SNAPSHOT = {
    "3dfuel", "3djake", "3dxtech", "abaflex", "addnorth", "amazonbasics",
    "ambrosia", "anycubic", "aurapol", "azurefilm", "bambulab", "catyarn",
    "cc3d", "closin", "cr3d", "creality", "dasfilament", "deeplee",
    "devildesign", "elegoo", "eryone", "esun", "extrudr", "fiberlogy",
    "filamentunger", "fillamentum", "flashforge", "formfutura", "fusion",
    "geeetech", "gembird", "gst3d", "hatchbox", "inland", "jayo", "ldo",
    "nobufil", "nthgrillon", "numakers", "overture", "polarfilament",
    "polymaker", "printedsolid", "protopasta", "prusament", "qiditech",
    "r3d", "ratrig", "redlinefilament", "rosa3d", "siddament", "smartfil",
    "soleyin", "spectrum", "sunlu", "tecbears", "tectonic3d", "teqstone",
    "tinmorry", "unitak3d", "verbatim", "voolt3d", "voxelpla", "winkle",
    "xzn", "ziro3d", "zyltech"
}


class ApiError(Exception):
    pass


def api(base, path, method="GET", payload=None, timeout=15, ctx=None, headers=None):
    url = base.rstrip("/") + path
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
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


def expand(doc, comment_base=COMMENT_BASE):
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
                "comment": (comment_base + note).strip(),
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


DIFF_FIELDS = (
    ("name", "str"),
    ("material", "str"),
    ("density", "float"),
    ("diameter", "float"),
    ("weight", "float"),
    ("spool_weight", "float"),
    ("color_hex", "hex"),
    ("settings_extruder_temp", "int"),
    ("settings_bed_temp", "int"),
)


def norm(value, kind):
    """Normalize a field value so payload and server record compare cleanly."""
    if value is None or value == "":
        return None
    try:
        if kind == "float":
            return round(float(value), 6)
        if kind == "int":
            return int(round(float(value)))
    except (TypeError, ValueError):
        return None
    if kind == "hex":
        return str(value).lstrip("#").lower()[:6] or None
    return str(value)


def diff_fields(existing, payload):
    """Return {field: (old, new)} for fields whose normalized values differ."""
    out = {}
    for field, kind in DIFF_FIELDS:
        old = norm(existing.get(field), kind)
        new = norm(payload.get(field), kind)
        if old != new:
            out[field] = (old, new)
    return out


def fmt_diff(changes):
    return ", ".join("%s: %s -> %s" % (f, o if o is not None else "-",
                                       n if n is not None else "-")
                     for f, (o, n) in sorted(changes.items()))


def gh(path, timeout):
    """GET a GitHub API path (a User-Agent header is mandatory there)."""
    return api(GITHUB_API, path, timeout=timeout, headers={"User-Agent": USER_AGENT})


def upstream_brands(directory):
    """Filename stems of the brands upstream SpoolmanDB already carries."""
    try:
        return {f[:-5].lower() for f in os.listdir(directory) if f.endswith(".json")}
    except OSError:
        return None


def pr_jobs(number, timeout, known):
    """Yield (label, doc, comment_base) for every filaments/*.json a PR touches."""
    try:
        pr = gh("/repos/%s/pulls/%s" % (SPOOLMANDB_REPO, number), timeout)
    except ApiError as exc:
        print("PR #%s: cannot read pull request -- %s" % (number, exc))
        return
    head = pr.get("head") or {}
    repo = head.get("repo")
    if not repo or not repo.get("full_name"):
        print("PR #%s: head repository is gone (fork deleted) -- skipped" % number)
        return
    full_name, ref = repo["full_name"], head.get("ref", "")
    print("PR #%s %s [%s:%s]" % (number, pr.get("title", "?"), full_name, ref))

    changed, page = [], 1
    while True:
        try:
            batch = gh("/repos/%s/pulls/%s/files?per_page=100&page=%d"
                       % (SPOOLMANDB_REPO, number, page), timeout) or []
        except ApiError as exc:
            print("PR #%s: cannot list changed files -- %s" % (number, exc))
            return
        changed.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    comment_base = PR_COMMENT_BASE % number
    for entry in changed:
        path = entry.get("filename", "")
        if entry.get("status") == "removed":
            continue
        if not (path.startswith("filaments/") and path.endswith(".json")):
            continue
        raw = "/%s/%s/%s" % (full_name, urllib.parse.quote(ref), path)
        try:
            doc = api(GITHUB_RAW, raw, timeout=timeout,
                      headers={"User-Agent": USER_AGENT})
        except ApiError as exc:
            print("  PR #%s: cannot fetch %s -- %s" % (number, path, exc))
            continue
        if not isinstance(doc, dict) or "filaments" not in doc:
            print("  PR #%s: %s is not a SpoolmanDB brand file -- skipped"
                  % (number, path))
            continue
        stem = os.path.basename(path)[:-5].lower()
        if known and stem in known:
            print("  WARNING PR #%s %s: upstream SpoolmanDB already carries this "
                  "brand -- importing creates LOCAL copies of its whole catalog "
                  "alongside Spoolman's native external-database entries "
                  "(duplicates in the filament picker)." % (number, path))
        yield ("PR #%s %s" % (number, path), doc, comment_base)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--url", required=True, help="Spoolman base URL")
    ap.add_argument("--apply", action="store_true", help="perform writes (default: dry run)")
    ap.add_argument("--update", action="store_true",
                    help="PATCH existing filaments whose values changed instead of skipping")
    ap.add_argument("--brands", help="comma-separated candidate file stems to limit to")
    ap.add_argument("--timeout", type=float, default=15)
    ap.add_argument("--insecure", action="store_true",
                    help="disable TLS verification (https URLs only; ignored for http)")
    ap.add_argument("--dir", default=CANDIDATE_DIR, help="candidate filaments directory")
    ap.add_argument("--pr", help="comma-separated open SpoolmanDB PR numbers to import "
                                 "as well (e.g. 478,479)")
    ap.add_argument("--spoolmandb-dir", default=None,
                    help="local SpoolmanDB filaments/ clone dir; overrides the "
                         "built-in upstream-brand snapshot used to warn when a "
                         "--pr brand already exists upstream")
    args = ap.parse_args()

    scheme = urllib.parse.urlparse(args.url).scheme.lower()
    if scheme not in ("http", "https"):
        print("--url must start with http:// or https:// (got %r)" % args.url)
        return 1

    ctx = None
    if args.insecure and scheme == "https":
        print("WARNING: TLS certificate verification disabled (--insecure).")
        ctx = ssl._create_unverified_context()
    elif args.insecure:
        print("Note: --insecure ignored; --url is plain http, so there is no TLS.")

    mode = "APPLY" if args.apply else "DRY RUN"
    try:
        info = api(args.url, "/api/v1/info", timeout=args.timeout, ctx=ctx)
    except ApiError as exc:
        print("Cannot reach Spoolman at %s: %s" % (args.url, exc))
        return 1
    print("Connected to Spoolman %s [%s]" % (info.get("version", "?"), mode))

    only = {b.strip().lower() for b in args.brands.split(",")} if args.brands else None
    if os.path.isdir(args.dir):
        files = sorted(f for f in os.listdir(args.dir) if f.endswith(".json"))
        files = [f for f in files if only is None or f[:-5].lower() in only]
    elif args.pr:
        # PR-only mode: local candidate files are optional.
        print("Note: candidate directory not found (%s); importing --pr brands only."
              % args.dir)
        files = []
    else:
        print("Candidate directory not found: %s" % args.dir)
        print("Run from a Filament Field Guide repo checkout, or point --dir at "
              "research/spoolmandb-contributions/filaments, or use --pr to import "
              "straight from open SpoolmanDB pull requests.")
        return 1

    # (label, doc, comment_base) -- local candidate files, then any --pr brands.
    # --brands filters the local files only.
    jobs = []
    for fname in files:
        with open(os.path.join(args.dir, fname)) as fh:
            jobs.append((fname, json.load(fh), COMMENT_BASE))
    if args.pr:
        known = UPSTREAM_BRANDS_SNAPSHOT
        if args.spoolmandb_dir:
            live = upstream_brands(args.spoolmandb_dir)
            if live is None:
                print("Note: no SpoolmanDB clone at %s -- falling back to the "
                      "built-in upstream-brand snapshot." % args.spoolmandb_dir)
            else:
                known = live
        for number in [p.strip() for p in args.pr.split(",") if p.strip()]:
            jobs.extend(pr_jobs(number, args.timeout, known))

    try:
        vendors = fetch_all(args.url, "/api/v1/vendor", args.timeout, ctx)
        existing_f = fetch_all(args.url, "/api/v1/filament", args.timeout, ctx)
    except ApiError as exc:
        print("Cannot list existing data: %s" % exc)
        return 1
    vendor_ids = {v["name"].strip().lower(): v["id"] for v in vendors}
    have = {(str((f.get("vendor") or {}).get("id")),
             (f.get("name") or "").strip().lower(),
             (f.get("material") or "").strip().lower()): f for f in existing_f}

    vc = vs = fc = fs = fu = ff = 0
    sample_shown = False
    for label, doc, comment_base in jobs:
        vendor = doc.get("manufacturer", "").strip()
        if not vendor:
            print("SKIP source  %s (no manufacturer)" % label)
            continue
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

        for payload in expand(doc, comment_base):
            sig = (str(vid), payload["name"].strip().lower(),
                   (payload["material"] or "").strip().lower())
            if sig in have:
                existing = have[sig]
                changes = diff_fields(existing, payload) if args.update else {}
                if not changes:
                    print("  SKIP   %s / %s (%s)" % (vendor, payload["name"], payload["material"]))
                    fs += 1
                    continue
                label = "  UPDATE %s / %s [%s]" % (vendor, payload["name"], fmt_diff(changes))
                if not args.apply:
                    print(label)
                    fu += 1
                    continue
                patch = {f: payload.get(f) for f in changes}
                try:
                    api(args.url, "/api/v1/filament/%s" % existing["id"], "PATCH",
                        patch, args.timeout, ctx)
                    print(label)
                    existing.update(patch)
                    fu += 1
                except ApiError as exc:
                    print("  FAIL   %s / %s: %s" % (vendor, payload["name"], exc))
                    ff += 1
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
                created = api(args.url, "/api/v1/filament", "POST",
                              dict(payload, vendor_id=vid), args.timeout, ctx)
                print("  CREATE %s / %s (%s)" % (vendor, payload["name"], payload["material"]))
                have[sig] = created if isinstance(created, dict) else dict(payload)
                fc += 1
            except ApiError as exc:
                print("  FAIL   %s / %s: %s" % (vendor, payload["name"], exc))
                ff += 1

    print("\n%s summary: vendors created=%d skipped=%d | filaments created=%d "
          "updated=%d skipped=%d failed=%d" % (mode, vc, vs, fc, fu, fs, ff))
    return 1 if ff else 0


if __name__ == "__main__":
    sys.exit(main())
