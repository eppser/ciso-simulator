"""Bake one day of Shadowserver honeypot data into the game's data file.

Reproducible: the raw API response is stored verbatim beside the baked file, and every
enrichment column names the table it came from. Read-only against zdc2-staging.

    python game/tools/build_day.py 2026-09-02

Inputs
  Shadowserver `honeypot/exploited-vulnerabilities` for one date (credentialed API; the
  `1d` field is the count of unique source IPs that day - verified equal to the public
  dashboard's `unique_ips` on 2026-08-21 across all 276 rows).
  core.cves            title, description, date_published, CVSS (CNA first, NVD second)
  derived.cve_detail   kev_status, first_kev_date, kev_any_ransomware, patch_available_date, epss
  derived.cve_classification  technology domain (five tiers; tier is kept)
"""
from __future__ import annotations
import json, os, sys, subprocess
from datetime import datetime, timezone
from pathlib import Path
import psycopg

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "data"
day = sys.argv[1] if len(sys.argv) > 1 else "2026-09-02"

raw_path = OUT / f"shadowserver-{day}.raw.json"
if not raw_path.exists():
    body = subprocess.check_output(
        ["shadowserver-api", "honeypot/exploited-vulnerabilities",
         json.dumps({"date": day, "limit": 5000})])
    raw_path.write_bytes(body)
rows = json.loads(raw_path.read_text())
print(f"{day}: {len(rows)} rows, {sum(r['connections'] for r in rows):,} connections")

ids = sorted({r["vulnerability"] for r in rows})
cves = [i for i in ids if i.startswith("CVE-")]

url = (f"postgresql://postgres.ewlsvqspmivodvolawzv:{os.environ['SUPABASE_DB_PASSWORD_STAGING']}"
       "@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require")
enrich: dict[str, dict] = {}
with psycopg.connect(url, connect_timeout=30) as c, c.cursor() as k:
    k.execute("""
      select c.cve_id, c.title, left(c.description, 600), c.date_published::date::text,
             coalesce(c.cna_cvss_score, c.nvd_cvss_score)::float8, c.cwe_ids,
             d.kev_status, d.first_kev_date::text, d.kev_any_ransomware,
             d.patch_available_date::text, d.patch_date_source, d.epss_score::float8,
             d.in_cisa, cl.category, cl.evidence_tier
      from core.cves c
      left join derived.cve_detail d on d.cve_id = c.cve_id
      left join derived.cve_classification cl on cl.cve_id = c.cve_id
      where c.cve_id = any(%s)""", (cves,))
    for (cid, title, desc, pub, cvss, cwe, kev, kevd, ransom, patch, psrc, epss, cisa, cat, tier) in k.fetchall():
        enrich[cid] = dict(title=title, description=desc, published=pub, cvss=cvss,
                           cwe=cwe, kev_status=kev, first_kev_date=kevd,
                           ransomware=bool(ransom), patch_date=patch, patch_source=psrc,
                           epss=epss, in_cisa=bool(cisa), domain=cat, domain_tier=tier)

out_rows = []
for r in rows:
    e = enrich.get(r["vulnerability"], {})
    out_rows.append({
        "id": r["vulnerability"], "vendor": r["vendor"], "product": r["product"],
        "device_class": r["class"], "iot": r["iot"] == "yes", "kind": r["type"],
        "connections": int(r["connections"]), "unique_ips": int(r["1d"]),
        "avg7": r["7d_avg"], "avg30": r["30d_avg"], "avg90": r["90d_avg"],
        "ss_severity": r["vulnerability_severity"], "ss_score": r["vulnerability_score"],
        "ss_cisa_kev": r["cisa_kev"] == "yes", "sensor_first_seen": r["first_seen"][:10],
        **e,
    })
out_rows.sort(key=lambda x: -x["connections"])
doc = {
    "day": day, "source": "Shadowserver Foundation honeypot/exploited-vulnerabilities",
    "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "enriched_from": "zdc2-staging core.cves, derived.cve_detail, derived.cve_classification",
    "rows": len(out_rows), "connections": sum(x["connections"] for x in out_rows),
    "unique_ips": sum(x["unique_ips"] for x in out_rows),
    "enriched": sum(1 for x in out_rows if x.get("description") is not None),
    "vulnerabilities": out_rows,
}
(OUT / f"day-{day}.json").write_text(json.dumps(doc, indent=1) + "\n")
print(f"enriched {doc['enriched']}/{len(cves)} CVEs, {doc['unique_ips']:,} unique IPs -> data/day-{day}.json")
