#!/usr/bin/env python3
"""
Gallery CSV Auditing and Enrichment Script

Analyzes data quality in galleries-consolidated.csv and identifies gaps.
"""

import csv
import httpx
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

CSV_PATH = Path("data/galleries-consolidated.csv")


@dataclass
class GalleryAudit:
    """Track audit findings for a gallery."""
    id: str
    name: str
    findings: list[str] = field(default_factory=list)
    website_status: Optional[int] = None
    website_final_url: Optional[str] = None
    website_error: Optional[str] = None
    has_empty_fields: bool = False
    empty_fields: list[str] = field(default_factory=list)


def load_galleries() -> list[dict]:
    """Load galleries CSV into list of dicts."""
    with open(CSV_PATH) as f:
        return list(csv.DictReader(f))


def check_website_reachability(url: str, timeout: int = 10) -> tuple[Optional[int], Optional[str], Optional[str]]:
    """
    Check if website URL is reachable.

    Returns:
        (status_code, final_url, error_message)
    """
    if not url or not url.strip():
        return None, None, "Empty URL"

    try:
        response = httpx.get(url, timeout=timeout, follow_redirects=True)
        return response.status_code, str(response.url), None
    except httpx.ConnectError as e:
        return None, None, f"Connection error: {e}"
    except httpx.TimeoutException as e:
        return None, None, f"Timeout: {e}"
    except Exception as e:
        return None, None, f"Error: {e}"


def audit_gallery(gallery: dict) -> GalleryAudit:
    """Audit a single gallery record."""
    audit = GalleryAudit(id=gallery.get("id", ""), name=gallery.get("name", ""))

    # Check for empty required fields
    required_fields = ["id", "name", "slug", "locations", "country", "type", "website"]
    for field in required_fields:
        value = gallery.get(field, "").strip()
        if not value:
            audit.has_empty_fields = True
            audit.empty_fields.append(field)
            audit.findings.append(f"Missing {field}")

    # Verify website reachability
    if gallery.get("website"):
        status, final_url, error = check_website_reachability(gallery["website"])
        audit.website_status = status
        audit.website_final_url = final_url
        audit.website_error = error

        if error:
            audit.findings.append(f"Website unreachable: {error}")
        elif status and status >= 400:
            audit.findings.append(f"Website returned {status} status")
        elif final_url and final_url != gallery["website"]:
            audit.findings.append(f"Website redirects to {final_url}")

    # Check for suspicious data
    if ";" in gallery.get("locations", "") and ";" not in gallery.get("country", ""):
        audit.findings.append("Multi-location gallery but single country (mismatch)")

    # Check for malformed location/country pairs
    locations = gallery.get("locations", "").split(";")
    countries = gallery.get("country", "").split(";")
    if len(locations) != len(countries):
        audit.findings.append(f"Location/country count mismatch: {len(locations)} vs {len(countries)}")

    return audit


def run_audit(max_workers: int = 5) -> list[GalleryAudit]:
    """Run full audit on all galleries."""
    galleries = load_galleries()
    audits = []

    logger.info(f"Auditing {len(galleries)} galleries...")
    for i, gallery in enumerate(galleries, 1):
        audit = audit_gallery(gallery)
        audits.append(audit)

        if audit.findings:
            logger.warning(f"[{i}/{len(galleries)}] {audit.name}: {'; '.join(audit.findings)}")
        else:
            logger.info(f"[{i}/{len(galleries)}] {audit.name}: OK")

    return audits


def print_summary(audits: list[GalleryAudit]) -> None:
    """Print audit summary."""
    total = len(audits)
    with_issues = [a for a in audits if a.findings]
    empty_field_count = sum(len(a.empty_fields) for a in audits)
    website_errors = [a for a in audits if a.website_error]
    website_redirects = [a for a in audits if a.website_final_url and a.website_final_url != ""]

    print("\n" + "="*70)
    print("GALLERY CSV AUDIT SUMMARY")
    print("="*70)
    print(f"Total galleries:              {total}")
    print(f"Galleries with issues:        {len(with_issues)} ({len(with_issues)/total*100:.1f}%)")
    print(f"Missing field instances:      {empty_field_count}")
    print(f"Website connectivity errors:  {len(website_errors)}")
    print(f"Website redirects:            {len(website_redirects)}")
    print("="*70)

    if with_issues:
        print("\nGALLERIES WITH ISSUES:")
        print("-"*70)
        for audit in sorted(with_issues, key=lambda a: len(a.findings), reverse=True):
            print(f"\n{audit.name} (ID: {audit.id})")
            for finding in audit.findings:
                print(f"  ⚠ {finding}")

    if website_errors:
        print("\nWEBSITE CONNECTIVITY ISSUES:")
        print("-"*70)
        for audit in website_errors:
            print(f"{audit.name}: {audit.website_error}")


if __name__ == "__main__":
    audits = run_audit()
    print_summary(audits)
