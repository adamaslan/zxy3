#!/usr/bin/env python3
"""
Gallery CSV Enrichment and Repair Script

Fixes data quality issues in galleries-consolidated.csv:
- Corrects location/country mismatches for multi-location galleries
- Updates redirected website URLs
- Adds new enrichment columns
"""

import csv
from pathlib import Path
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

CSV_PATH = Path("data/galleries-consolidated.csv")

# Corrections for location/country mismatches
# Format: gallery_name -> (corrected_locations, corrected_countries)
LOCATION_FIXES = {
    "Carpenter's Workshop Gallery": (
        "New York; London; Paris; San Francisco",
        "USA; UK; France; USA",
    ),
    "Clearing": (
        "New York; Los Angeles; Brussels",
        "USA; USA; Belgium",
    ),
    "David Zwirner": (
        "New York; London; Paris; Hong Kong; Los Angeles",
        "USA; UK; France; China; USA",
    ),
    "Mana Contemporary": (
        "Jersey City; Chicago",
        "USA; USA",
    ),
    "Tiger Strikes Asteroid": (
        "Philadelphia; New York; Los Angeles; Chicago; Greenville",
        "USA; USA; USA; USA; USA",
    ),
    "Winston Wächter Fine Art": (
        "New York; Seattle",
        "USA; USA",
    ),
}

# Corrections for redirected URLs
# Format: gallery_name -> new_url
WEBSITE_FIXES = {
    "Alt Esc": "https://www.altesc.net",  # Parked domain - keep original
    "Carpenter's Workshop Gallery": "https://carpentersworkshopgallery.com",
    "Galeria Agustina Ferreyra": "https://agustinaferreyra.com",
    "Jenny's": "https://jennys.us",
    "Microscope Gallery": "https://microscopegallery.com",
    "Pioneer Works": "https://pioneerworks.org",
    "Provincetown Art Association & Museum": "https://paam.org",
    "Radiator Gallery": "https://radiatorgallery.com",
    "The Strzeminski Academy of Fine Arts": "https://www.asp.lodz.pl",
    "Untitled Art Fair": "https://untitledartfairs.com",
    "Winston Wächter Fine Art": "https://www.winstonwachter.com",
}

# Galleries with unreachable/invalid websites (mark as inactive)
UNREACHABLE_GALLERIES = {
    "550 Gallery",
    "Alexandra Arts / ART511MAG",
    "Felix Art Show",
    "Galerie Manque",
    "International Gallery",
    "Jorge Andrew Gallery",
    "King's Leap",
    "Mery Gates",
    "Satellite Art Show",
    "Tanya Bondakar Gallery",
    "The Border",
    "Underdonk",
}


def load_galleries() -> list[dict]:
    """Load galleries CSV into list of dicts."""
    with open(CSV_PATH) as f:
        return list(csv.DictReader(f))


def save_galleries(galleries: list[dict], fieldnames: list[str]) -> None:
    """Save galleries list back to CSV."""
    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(galleries)


def enrich_galleries() -> dict:
    """Apply all enrichments to the gallery dataset."""
    galleries = load_galleries()
    changes = {
        "location_fixes": 0,
        "website_fixes": 0,
        "marked_inactive": 0,
    }

    for gallery in galleries:
        name = gallery.get("name", "")

        # Fix location/country mismatches
        if name in LOCATION_FIXES:
            new_locations, new_countries = LOCATION_FIXES[name]
            old_locations = gallery.get("locations", "")
            old_countries = gallery.get("country", "")

            if old_locations != new_locations or old_countries != new_countries:
                gallery["locations"] = new_locations
                gallery["country"] = new_countries
                changes["location_fixes"] += 1
                logger.info(f"Fixed locations/countries for {name}")
                logger.debug(f"  Locations: {old_locations} → {new_locations}")
                logger.debug(f"  Countries: {old_countries} → {new_countries}")

        # Fix redirected URLs
        if name in WEBSITE_FIXES:
            old_url = gallery.get("website", "")
            new_url = WEBSITE_FIXES[name]
            if old_url != new_url:
                gallery["website"] = new_url
                changes["website_fixes"] += 1
                logger.info(f"Updated URL for {name}")
                logger.debug(f"  {old_url} → {new_url}")

        # Mark unreachable galleries as inactive
        if name in UNREACHABLE_GALLERIES:
            # Check if we have a status column, if not we'll add it later
            if "status" in gallery:
                gallery["status"] = "inactive"
                changes["marked_inactive"] += 1
                logger.info(f"Marked {name} as inactive (unreachable website)")

    return changes, galleries


def add_column_if_missing(galleries: list[dict], column: str, default: str = "") -> None:
    """Add a new column to all galleries if it doesn't exist."""
    if not galleries:
        return

    if column not in galleries[0]:
        for gallery in galleries:
            gallery[column] = default
        logger.info(f"Added column '{column}' with default value '{default}'")


def main():
    """Run enrichment pipeline."""
    logger.info("Starting gallery enrichment pipeline...")

    changes, galleries = enrich_galleries()

    # Add new columns
    add_column_if_missing(galleries, "status", "active")
    add_column_if_missing(galleries, "instagram", "")
    add_column_if_missing(galleries, "founded_year", "")
    add_column_if_missing(galleries, "last_verified", "")

    # Mark unreachable galleries in status column
    for gallery in galleries:
        if gallery.get("name") in UNREACHABLE_GALLERIES:
            gallery["status"] = "inactive_website_unreachable"

    # Save updated CSV with new columns
    if galleries:
        fieldnames = list(galleries[0].keys())
        save_galleries(galleries, fieldnames)

    # Print summary
    print("\n" + "="*70)
    print("GALLERY ENRICHMENT SUMMARY")
    print("="*70)
    print(f"Location/country fixes:    {changes['location_fixes']}")
    print(f"Website URL fixes:         {changes['website_fixes']}")
    print(f"Marked as inactive:        {changes['marked_inactive'] + len(UNREACHABLE_GALLERIES)}")
    print("="*70)
    print(f"\nUpdated CSV saved to {CSV_PATH}")

    logger.info("Enrichment complete!")


if __name__ == "__main__":
    main()
