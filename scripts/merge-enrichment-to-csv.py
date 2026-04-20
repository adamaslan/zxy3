#!/usr/bin/env python3
"""
Merge artist enrichment data (Instagram, CV) back into the CSV.
"""

import json
import csv
from pathlib import Path

CSV_PATH = Path(__file__).parent.parent / "data" / "artists-consolidated.csv"
ENRICHMENT_PATH = Path(__file__).parent.parent / "data" / "artist-enrichment.json"

def merge_enrichment():
    """Merge enrichment data into CSV."""
    # Load enrichment
    with open(ENRICHMENT_PATH, 'r') as f:
        enrichment = json.load(f)

    enrichment_by_name = enrichment if isinstance(enrichment, dict) else {item['name']: item for item in enrichment}

    # Load CSV
    with open(CSV_PATH, 'r') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    # Add cv_url column if it doesn't exist
    if 'cv_url' not in fieldnames:
        fieldnames = list(fieldnames) + ['cv_url']

    # Update rows
    insta_updated = 0
    cv_updated = 0

    for row in rows:
        name = row.get('name', '').strip()
        if name and name in enrichment_by_name:
            enriched = enrichment_by_name[name]

            # Update Instagram if missing
            if not row.get('instagram') and enriched.get('instagram'):
                row['instagram'] = enriched['instagram']
                insta_updated += 1

            # Add CV URL
            if enriched.get('cv_pdf') and 'cv_url' in fieldnames:
                row['cv_url'] = enriched['cv_pdf']
                cv_updated += 1

    # Save updated CSV
    with open(CSV_PATH, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ CSV updated successfully!")
    print(f"   Instagram updated: {insta_updated}")
    print(f"   CV URLs added: {cv_updated}")

    # Summary
    with open(CSV_PATH, 'r') as f:
        reader = csv.DictReader(f)
        rows_with_website = [r for r in reader if r.get('website')]
        rows_with_instagram = [r for r in rows_with_website if r.get('instagram')]
        rows_with_cv = [r for r in rows_with_website if r.get('cv_url')]

    print(f"\n📊 Final Summary:")
    print(f"   Artists with websites: {len(rows_with_website)}")
    print(f"   With Instagram: {len(rows_with_instagram)} ({len(rows_with_instagram)*100//len(rows_with_website) if rows_with_website else 0}%)")
    print(f"   With CV URL: {len(rows_with_cv)} ({len(rows_with_cv)*100//len(rows_with_website) if rows_with_website else 0}%)")

if __name__ == "__main__":
    merge_enrichment()
