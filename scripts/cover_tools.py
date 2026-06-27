#!/usr/bin/env python3
"""Helpers for resolving + downloading missing ethnography covers.

Usage:
  python3 scripts/cover_tools.py list          # print books missing a cover file
  python3 scripts/cover_tools.py download FILE  # download from a TSV of slug<TAB>url
"""
import re
import os
import sys
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(ROOT, "assets", "covers")


def load_books():
    src = open(os.path.join(ROOT, "books-data.js"), encoding="utf-8").read()
    arr = src[src.index("["):src.rindex("]") + 1]
    return json.loads(arr)


def load_slug_map():
    g = open(os.path.join(ROOT, "globe.js"), encoding="utf-8").read()
    mtext = re.search(r"COVER_SLUG_BY_BOOK_ID = \{(.*?)\};", g, re.S).group(1)
    return dict(re.findall(r'"(ethnography-\d+)":\s*"([^"]+)"', mtext))


def have_files():
    return set(f[:-4] for f in os.listdir(COVERS) if f.endswith(".jpg"))


def slugify(en):
    s = en.lower()
    s = re.sub(r"[\u2018\u2019\u201c\u201d]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def en_title(t):
    m = re.search(r"\(([^)]*)\)\s*$", t)
    if m:
        return m.group(1)
    m = re.search(r"\((.*)\)", t)
    return m.group(1) if m else t


def missing_books():
    books = load_books()
    mp = load_slug_map()
    have = have_files()
    out = []
    for b in books:
        en = en_title(b["title"])
        mapped = mp.get(b["id"])
        auto = slugify(en)
        if (mapped and mapped in have) or auto in have:
            continue
        slug = auto
        out.append({
            "id": b["id"],
            "slug": slugify(en),
            "en": en,
            "author": b["author"],
            "year": b["year"],
            "pub": b["publisher"],
        })
    return out


def cmd_list():
    out = missing_books()
    print(len(out), "missing")
    for o in out:
        print("\t".join([o["id"], o["slug"], o["en"], str(o["year"]), o["pub"]]))


def cmd_groups():
    out = missing_books()
    groups = {
        "ucpress": ["University of California Press"],
        "princeton_chicago": ["Princeton University Press", "University of Chicago Press"],
        "duke": ["Duke University Press"],
        "stanford_cornell": ["Stanford University Press", "Cornell University Press"],
        "misc1": ["Cambridge University Press", "Columbia University Press",
                   "University of Minnesota Press", "University of Pennsylvania Press",
                   "Indiana University Press"],
    }
    assigned = set()
    os.makedirs(os.path.join(ROOT, "scripts", "groups"), exist_ok=True)
    for gname, pubs in groups.items():
        rows = [o for o in out if o["pub"] in pubs]
        for o in rows:
            assigned.add(o["id"])
        write_group(gname, rows)
    misc2 = [o for o in out if o["id"] not in assigned]
    write_group("misc2", misc2)


def write_group(gname, rows):
    path = os.path.join(ROOT, "scripts", "groups", gname + ".tsv")
    with open(path, "w", encoding="utf-8") as f:
        for o in rows:
            f.write("\t".join([o["id"], o["slug"], o["en"], str(o["year"]),
                               o["author"], o["pub"]]) + "\n")
    print(f"{gname}: {len(rows)} -> {path}")


def _img_dims(path):
    """Return (w,h) using sips, or None."""
    import subprocess
    try:
        r = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", path],
                           capture_output=True, text=True)
        w = re.search(r"pixelWidth: (\d+)", r.stdout)
        h = re.search(r"pixelHeight: (\d+)", r.stdout)
        if w and h:
            return int(w.group(1)), int(h.group(1))
    except Exception:
        pass
    return None


def cmd_fetch(tsv_path):
    """TSV columns: slug, url, source_page, isbn, publisher[, title, author, year]."""
    import subprocess
    rows = []
    for line in open(tsv_path, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip() or line.startswith("#"):
            continue
        rows.append(line.split("\t"))
    results = []
    for r in rows:
        slug, url = r[0], r[1]
        source_page = r[2] if len(r) > 2 else ""
        isbn = r[3] if len(r) > 3 else ""
        pub = r[4] if len(r) > 4 else ""
        title = r[5] if len(r) > 5 else ""
        author = r[6] if len(r) > 6 else ""
        year = r[7] if len(r) > 7 else ""
        dest = os.path.join(COVERS, slug + ".jpg")
        tmp = os.path.join("/tmp", slug + ".download")
        status, error, nbytes, dims = "error", None, 0, None
        try:
            cu = subprocess.run([
                "curl", "-s", "-f", "-L", "-o", tmp, "-w", "%{http_code}",
                "--connect-timeout", "20",
                "--max-time", "240",
                "--retry", "3",
                "--retry-delay", "2",
                "-H", "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                url], capture_output=True, text=True)
            code = cu.stdout.strip()
            if cu.returncode != 0:
                error = f"curl failed ({cu.returncode}) http {code}: {cu.stderr.strip()[:160]}"
            elif code != "200" or not os.path.exists(tmp):
                error = f"http {code}"
            else:
                nbytes = os.path.getsize(tmp)
                ftype = subprocess.run(["file", "-b", tmp], capture_output=True, text=True).stdout
                if nbytes < 6000:
                    error = f"too small ({nbytes}b)"
                elif "JPEG" in ftype or "PNG" in ftype or "image" in ftype.lower():
                    # convert to JPEG (sips handles PNG/JPEG)
                    subprocess.run(["sips", "-s", "format", "jpeg", tmp, "--out", dest],
                                   capture_output=True, text=True)
                    dims = _img_dims(dest)
                    if dims and dims[0] >= 280:
                        nbytes = os.path.getsize(dest)
                        status = "ok"
                        error = None
                    else:
                        error = f"too small dims {dims}"
                        if os.path.exists(dest):
                            os.remove(dest)
                else:
                    error = f"not image: {ftype[:40]}"
        except Exception as e:
            error = str(e)
        results.append({
            "slug": slug, "title": title, "author": author,
            "year": year, "publisher": pub, "isbn": isbn,
            "source_page": source_page, "cover_url": url,
            "saved_path": f"assets/covers/{slug}.jpg" if status == "ok" else None,
            "bytes": nbytes, "dims": dims, "status": status, "error": error,
        })
        print(f"[{status}] {slug} {dims} {nbytes}b {error or ''}")
    out_json = tsv_path.rsplit(".", 1)[0] + ".result.json"
    json.dump(results, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    ok = sum(1 for x in results if x["status"] == "ok")
    print(f"\n{ok}/{len(results)} ok -> {out_json}")


def cmd_manifest():
    """Merge all scripts/groups/*.fetch.result.json into assets/covers/_manifest.json.

    Keeps existing entries, adds/updates new ones (dedup by slug), only entries
    whose cover file currently exists on disk. Also regenerates _manifest.csv.
    This is record-keeping only; it does NOT wire covers into the website.
    """
    import glob
    import csv
    manifest_path = os.path.join(COVERS, "_manifest.json")
    existing = []
    if os.path.exists(manifest_path):
        existing = json.load(open(manifest_path, encoding="utf-8"))
    by_slug = {e["slug"]: e for e in existing}

    gdir = os.path.join(ROOT, "scripts", "groups")
    for rj in sorted(glob.glob(os.path.join(gdir, "*.fetch.result.json"))):
        for r in json.load(open(rj, encoding="utf-8")):
            slug = r.get("slug")
            if not slug or r.get("status") != "ok":
                continue
            if not os.path.exists(os.path.join(COVERS, slug + ".jpg")):
                continue
            entry = by_slug.get(slug, {})
            entry.update({
                "slug": slug,
                "sheet": entry.get("sheet", ""),
                "title": r.get("title") or entry.get("title", ""),
                "author": r.get("author") or entry.get("author", ""),
                "year": r.get("year") or entry.get("year", ""),
                "publisher": r.get("publisher") or entry.get("publisher", ""),
                "isbn": r.get("isbn") or entry.get("isbn", ""),
                "source_page": r.get("source_page") or entry.get("source_page", ""),
                "cover_url": r.get("cover_url") or entry.get("cover_url", ""),
                "saved_path": f"assets/covers/{slug}.jpg",
                "bytes": os.path.getsize(os.path.join(COVERS, slug + ".jpg")),
                "status": "ok",
                "error": None,
            })
            by_slug[slug] = entry

    merged = sorted(by_slug.values(), key=lambda e: e["slug"])
    json.dump(merged, open(manifest_path, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    cols = ["slug", "sheet", "title", "author", "year", "publisher", "isbn",
            "source_page", "cover_url", "saved_path", "bytes", "status"]
    with open(os.path.join(COVERS, "_manifest.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for e in merged:
            w.writerow(e)
    print(f"manifest: {len(merged)} entries -> {manifest_path}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    if cmd == "list":
        cmd_list()
    elif cmd == "groups":
        cmd_groups()
    elif cmd == "fetch":
        cmd_fetch(sys.argv[2])
    elif cmd == "manifest":
        cmd_manifest()
