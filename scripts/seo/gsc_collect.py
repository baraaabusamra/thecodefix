# GSC weekly snapshot collector — runs INSIDE the Composio remote workbench
# (it needs `run_composio_tool`, which only exists there). See
# .claude/skills/gsc-snapshot/SKILL.md for the full procedure.
#
# Usage inside the workbench (paste this file as one cell, then):
#   text, sha = snapshot_week("2026-10-12")          # a Monday
#   print(sha); print(text)
#
# It prints the exact file text to save as docs/seo/gsc/<week>.json and its
# sha256. The local side verifies the sha before committing, so a copied file
# can never silently differ from what Search Console returned.
#
# Read-only: only GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY and
# GOOGLE_SEARCH_CONSOLE_INSPECT_URL are called. Never submits sitemaps or
# requests indexing.

import datetime as _dt
import hashlib as _hashlib
import json as _json_mod
import os as _os
import re as _re
import unicodedata as _ud

PROPERTY = "https://thecodefix.net/"
ORIGIN = "https://thecodefix.net"
SCHEMA = 1
BRAND_RE = _re.compile(r"the\s*code\s*fix|thecodefix|ذا\s*كود\s*فكس|كود\s*فكس", _re.I)
LIMITS = {"pages": 200, "queries": 200, "page_queries": 300}


def _rows(result):
    data = (result or {}).get("data") or {}
    return data.get("rows") or (result or {}).get("rows") or []


def _query(dimensions, start, end, data_state="all"):
    out, start_row = [], 0
    while True:
        res, err = run_composio_tool(  # noqa: F821 — provided by the workbench
            "GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY",
            {
                "site_url": PROPERTY,
                "start_date": start,
                "end_date": end,
                "dimensions": dimensions,
                "data_state": data_state,
                "row_limit": 5000,
                "start_row": start_row,
            },
        )
        if err:
            raise RuntimeError(f"GSC query {dimensions} failed: {err}")
        rows = _rows(res)
        for r in rows:  # see _dump: NFC so the text survives being copied out of the workbench
            r["keys"] = [_ud.normalize("NFC", k) for k in r.get("keys", [])]
        out.extend(rows)
        if len(rows) < 5000:
            return out
        start_row += 5000


def _path(url):
    if not url.startswith(ORIGIN):
        return url
    return url[len(ORIGIN):] or "/"


def _agg(rows):
    clicks = sum(r["clicks"] for r in rows)
    impr = sum(r["impressions"] for r in rows)
    pos = sum(r["position"] * r["impressions"] for r in rows) / impr if impr else None
    return {"clicks": int(clicks), "impressions": int(impr), "position": round(pos, 2) if pos else None}


def _bucket(query):
    if query.lower().startswith("site:"):
        return "site"
    if BRAND_RE.search(query):
        return "brand"
    return "other"


def _inspect(paths):
    out = []
    for p in paths:
        res, err = run_composio_tool(  # noqa: F821
            "GOOGLE_SEARCH_CONSOLE_INSPECT_URL",
            {"site_url": PROPERTY, "inspection_url": ORIGIN + p},
        )
        if err:
            out.append({"path": p, "error": str(err)[:200]})
            continue
        r = ((res or {}).get("data") or {})
        r = r.get("inspectionResult") or r
        idx = r.get("indexStatusResult") or {}
        out.append({
            "path": p,
            "verdict": idx.get("verdict"),
            "coverageState": idx.get("coverageState"),
            "lastCrawlTime": idx.get("lastCrawlTime"),
            "canonicalMatches": (idx.get("googleCanonical") or "") == (idx.get("userCanonical") or ""),
        })
    return out


def _json(v):
    # Arabic stays readable, but invisible format characters (Cf: zero-width,
    # RTL marks) are \u-escaped and all text is NFC (see _query): both are
    # what gets lost when the snapshot is copied through a conversation, and
    # the sha check would otherwise fail on them. JSON-parsing gives the same string.
    s = _json_mod.dumps(v, ensure_ascii=False, separators=(",", ":"))
    return "".join(f"\\u{ord(c):04x}" if _ud.category(c) == "Cf" else c for c in s)


def _dump(snap):
    """Stable, diff-friendly text: one top-level key per line, one row per line."""
    lines = ["{"]
    keys = list(snap.keys())
    for i, k in enumerate(keys):
        v = snap[k]
        comma = "," if i < len(keys) - 1 else ""
        if isinstance(v, list) and v:
            lines.append(f'"{k}":[')
            for j, row in enumerate(v):
                rc = "," if j < len(v) - 1 else ""
                lines.append(_json(row) + rc)
            lines.append("]" + comma)
        else:
            lines.append(f'"{k}":' + _json(v) + comma)
    lines.append("}")
    return "\n".join(lines) + "\n"


def snapshot_week(monday, inspect_paths=None, limits=None, min_impressions=1):
    """limits / min_impressions trim the stored rows (counts and totals stay exact).
    The live weekly run uses the defaults; the one-off backfill used
    limits={"pages": 100, "queries": 120, "page_queries": 150}, min_impressions=2."""
    lim = dict(LIMITS, **(limits or {}))
    keep = lambda rows: [r for r in rows if r["impressions"] >= min_impressions]  # noqa: E731
    d0 = _dt.date.fromisoformat(monday)
    if d0.weekday() != 0:
        raise ValueError(f"{monday} is not a Monday")
    d1 = d0 + _dt.timedelta(days=6)
    start, end = d0.isoformat(), d1.isoformat()
    iso = d0.isocalendar()

    daily = _query(["date"], start, end)
    queries = _query(["query"], start, end)
    pages = _query(["page"], start, end)
    page_queries = _query(["page", "query"], start, end)

    totals = _agg(daily)
    buckets = {b: _agg([r for r in queries if _bucket(r["keys"][0]) == b]) for b in ("brand", "site", "other")}
    named = sum(v["impressions"] for v in buckets.values())
    buckets["anonymized_impressions"] = max(0, totals["impressions"] - named)

    by_impr = lambda r: (-r["impressions"], -r["clicks"])  # noqa: E731
    snap = {
        "schema": SCHEMA,
        "property": PROPERTY,
        "week": f"{iso[0]}-W{iso[1]:02d}",
        "start": start,
        "end": end,
        "data_state": "all",
        "collected_at": _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat(),
        # GSC data lags 2–3 days; a week read sooner may still grow. Re-collect it later.
        "complete": (_dt.datetime.now(_dt.timezone.utc).date() - d1).days >= 3,
        "totals": totals,
        "buckets": buckets,
        "counts": {"pages": len(pages), "queries": len(queries), "page_queries": len(page_queries)},
        "trim": {"limits": lim, "min_impressions": min_impressions},
        "columns": {
            "daily": ["date", "clicks", "impressions", "position"],
            "pages": ["path", "clicks", "impressions", "position"],
            "queries": ["query", "bucket", "clicks", "impressions", "position"],
            "page_queries": ["path", "query", "clicks", "impressions", "position"],
        },
        "daily": [[r["keys"][0], int(r["clicks"]), int(r["impressions"]), round(r["position"], 2)] for r in daily],
        "pages": [[_path(r["keys"][0]), int(r["clicks"]), int(r["impressions"]), round(r["position"], 2)]
                  for r in sorted(keep(pages), key=by_impr)[: lim["pages"]]],
        "queries": [[r["keys"][0], _bucket(r["keys"][0]), int(r["clicks"]), int(r["impressions"]), round(r["position"], 2)]
                    for r in sorted(keep(queries), key=by_impr)[: lim["queries"]]],
        "page_queries": [[_path(r["keys"][0]), r["keys"][1], int(r["clicks"]), int(r["impressions"]), round(r["position"], 2)]
                         for r in sorted(keep(page_queries), key=by_impr)[: lim["page_queries"]]],
        "inspections": _inspect(inspect_paths) if inspect_paths else [],
    }
    text = _dump(snap)
    sha = _hashlib.sha256(text.encode("utf-8")).hexdigest()
    _os.makedirs("/mnt/files/seo/gsc", exist_ok=True)
    with open(f"/mnt/files/seo/gsc/{snap['week']}.json", "w", encoding="utf-8") as f:
        f.write(text)
    return text, sha


def last_complete_monday(today=None):
    """Monday of the most recent Mon–Sun week that ended at least 3 days ago (GSC lag),
    i.e. the latest week whose snapshot will have complete=true."""
    t = today or _dt.date.today()
    last_sunday = t - _dt.timedelta(days=(t.weekday() + 1) % 7 or 7)
    if (t - last_sunday).days < 3:
        last_sunday -= _dt.timedelta(days=7)
    return (last_sunday - _dt.timedelta(days=6)).isoformat()
