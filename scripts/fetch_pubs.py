#!/usr/bin/env python3
"""Fetch publications from OpenAlex and write data/publications.json.

Exits non-zero (and leaves the existing file untouched) when the fetch fails
or returns no items.
"""

import datetime
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CONFIG_PATH = DATA_DIR / "config.json"
MANUAL_PATH = DATA_DIR / "manual_pubs.json"
OUTPUT_PATH = DATA_DIR / "publications.json"
ENV_PATH = ROOT / ".env"

API_URL = "https://api.openalex.org/works"
PER_PAGE = 200
TIMEOUT = 30
MAX_RETRIES = 4

# OpenAlex work types that are not publications in their own right.
EXCLUDED_TYPES = {
    "paratext",
    "erratum",
    "retraction",
    "peer-review",
    "supplementary-materials",
    "dataset",
    "grant",
    "letter",
    "editorial",
}

# Title prefixes of journal cover items; unmapped ones are dropped with a warning.
COVER_TITLE_RE = re.compile(
    r"^(front|inside front|inside back|back|inside) cover|^cover (feature|picture|profile)"
    r"|^(innentitelbild|titelbild|rücktitelbild)",
    re.IGNORECASE,
)

# Lowercase surname particles kept with the family name ("L. Caire da Silva").
PARTICLES = {"da", "de", "del", "der", "di", "dos", "du", "la", "le", "van", "von"}

SELECT_FIELDS = ",".join([
    "id", "doi", "display_name", "type", "publication_year", "publication_date",
    "authorships", "primary_location", "biblio",
])


def load_setting(name):
    """Return a setting from the environment (GitHub Secret) or a local .env file."""
    value = os.environ.get(name, "").strip()
    if value or not ENV_PATH.exists():
        return value
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return ""


def load_auth():
    """Optional OpenAlex query parameters: api_key (OPENALEX_API_KEY), mailto (OPENALEX_MAILTO)."""
    auth = {"api_key": load_setting("OPENALEX_API_KEY"), "mailto": load_setting("OPENALEX_MAILTO")}
    return {k: v for k, v in auth.items() if v}


def redact(text):
    """Hide the API key and contact email in messages that may echo the request URL."""
    return re.sub(r"((?:api_key|mailto)=)[^&\s)'\"]+", r"\1***", text)


def get_json(params):
    """GET the works endpoint with retries on transient errors."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(API_URL, params=params, timeout=TIMEOUT)
        except requests.RequestException as exc:
            err = redact(str(exc))
        else:
            if resp.status_code == 200:
                return resp.json()
            err = redact(f"HTTP {resp.status_code}: {resp.text[:200]}")
            if resp.status_code not in (429, 500, 502, 503, 504):
                break
        wait = 2 ** attempt * 5
        print(f"  request failed ({err}); retrying in {wait}s", file=sys.stderr)
        time.sleep(wait)
    raise RuntimeError(f"OpenAlex request failed: {err}")


def fetch_author_works(author_id, auth):
    """Yield every work for one OpenAlex author ID using cursor paging."""
    cursor = "*"
    while cursor:
        params = {
            "filter": f"author.id:{author_id}",
            "per-page": PER_PAGE,
            "cursor": cursor,
            "select": SELECT_FIELDS,
            **auth,
        }
        data = get_json(params)
        results = data.get("results") or []
        yield from results
        cursor = data.get("meta", {}).get("next_cursor") if results else None


def clean_text(text):
    """Normalize unicode and whitespace; turn unicode hyphens into ASCII."""
    text = unicodedata.normalize("NFC", text or "")
    text = re.sub(r"[‐‑‒–−]", "-", text)
    return re.sub(r"\s+", " ", text).strip()


def initial(token):
    """'Jeehye' -> 'J.', 'Hee-Young' -> 'H.-Y.', 'A.' -> 'A.'"""
    parts = [p for p in token.split("-") if p]
    return "-".join(p[0].upper() + "." for p in parts)


def format_author(name):
    """Convert a full name to 'initials + surname' (Jeehye Byun -> J. Byun)."""
    name = clean_text(name)
    if "," in name:
        family, given = [s.strip() for s in name.split(",", 1)]
        name = f"{given} {family}"
    tokens = name.replace(".", ". ").split()
    if len(tokens) < 2:
        return name
    # The family name starts at the last token, pulled left over any particles.
    start = len(tokens) - 1
    while start > 1 and tokens[start - 1].lower() in PARTICLES:
        start -= 1
    given, family = tokens[:start], tokens[start:]
    return " ".join([initial(t) for t in given] + family)


def title_key(title):
    return re.sub(r"[^a-z0-9]", "", clean_text(title).lower())


def record_key(item):
    doi = (item.get("doi") or "").lower()
    return ("doi", doi) if doi else ("title", title_key(item.get("title")))


def format_pages(biblio):
    first, last = biblio.get("first_page"), biblio.get("last_page")
    if first and last and first != last:
        return f"{first}-{last}"
    return first or last or None


def to_item(work):
    source = (work.get("primary_location") or {}).get("source") or {}
    biblio = work.get("biblio") or {}
    return {
        "title": clean_text(work.get("display_name")),
        "authors": [
            format_author(a["author"]["display_name"])
            for a in work.get("authorships") or []
            if (a.get("author") or {}).get("display_name")
        ],
        "journal": clean_text(source.get("display_name")) or None,
        "volume": biblio.get("volume") or None,
        "issue": biblio.get("issue") or None,
        "pages": format_pages(biblio),
        "year": work.get("publication_year"),
        "date": work.get("publication_date"),
        "doi": work.get("doi") or None,
        "url": None,
        "covers": [],
    }


ITEM_FIELDS = ("title", "authors", "journal", "volume", "issue", "pages", "year", "date", "doi", "url")


def normalize_manual(item):
    """Fill missing schema fields of a manual entry with null."""
    normalized = {field: item.get(field) for field in ITEM_FIELDS}
    normalized["covers"] = []
    return normalized


def bare_doi(doi):
    return (doi or "").lower().replace("https://doi.org/", "")


def attach_covers(items, covers):
    """Attach configured cover links to their parent articles."""
    by_doi = {bare_doi(i["doi"]): i for i in items if i["doi"]}
    for cover in covers:
        parent = by_doi.get(bare_doi(cover["parent_doi"]))
        if parent is None:
            print(f"  warning: cover parent not found: {cover['parent_doi']}", file=sys.stderr)
            continue
        doi = bare_doi(cover.get("doi"))
        parent["covers"].append({
            "label": cover["label"],
            "doi": f"https://doi.org/{doi}" if doi else None,
            "url": cover.get("url"),
        })


def load_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def collect(config, auth):
    excluded_dois = {bare_doi(d) for d in config.get("exclude_dois", [])}
    covers = config.get("covers", [])
    cover_dois = {bare_doi(c.get("doi")) for c in covers} - {""}
    min_year = config.get("min_year") or 0

    merged = {}
    for author_id in config["openalex_author_ids"]:
        count = 0
        for work in fetch_author_works(author_id, auth):
            count += 1
            if work.get("type") in EXCLUDED_TYPES:
                continue
            if (work.get("publication_year") or 0) < min_year:
                continue
            item = to_item(work)
            if not item["title"] or not item["doi"]:
                continue
            doi = bare_doi(item["doi"])
            if doi in excluded_dois or doi in cover_dois:
                continue
            if COVER_TITLE_RE.match(item["title"]):
                print(f"  warning: unmapped cover skipped: {item['doi']} {item['title'][:60]}", file=sys.stderr)
                continue
            merged.setdefault(record_key(item), item)
        print(f"{author_id}: {count} works fetched")

    if not merged:
        raise RuntimeError("OpenAlex returned no usable works")

    # Manual entries override OpenAlex entries with the same DOI or title.
    for item in load_json(MANUAL_PATH, []):
        item = normalize_manual(item)
        merged[record_key(item)] = item

    items = list(merged.values())
    attach_covers(items, covers)
    return sorted(
        items,
        key=lambda i: (i.get("date") or f"{i.get('year') or 0}-00-00", i["title"].lower()),
        reverse=True,
    )


def main():
    config = load_json(CONFIG_PATH, {})
    if not config.get("openalex_author_ids"):
        print("config.json has no openalex_author_ids", file=sys.stderr)
        return 1

    try:
        items = collect(config, load_auth())
    except Exception as exc:  # keep the existing file on any failure
        print(f"Fetch failed, existing data kept: {exc}", file=sys.stderr)
        return 1

    existing = load_json(OUTPUT_PATH, {})
    if existing.get("items") == items:
        print(f"No changes ({len(items)} items); file not rewritten")
        return 0

    output = {
        "updated": datetime.date.today().isoformat(),
        "count": len(items),
        "items": items,
    }
    text = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    with open(OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(f"Wrote {len(items)} items to {OUTPUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
