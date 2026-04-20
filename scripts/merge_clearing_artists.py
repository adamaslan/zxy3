#!/usr/bin/env python3
"""
Merge CLEARING gallery artists into consolidated CSV.
Lightweight alternative to the hybrid bash workflow.
"""

import csv
import sys
from pathlib import Path
from collections import defaultdict

# CLEARING artists extracted from https://www.c-l-e-a-r-i-n-g.com/home-2/
CLEARING_ARTISTS = [
    # Primary represented artists
    {"name": "Harold Ancart", "gallery": "CLEARING"},
    {"name": "Jean-Marie Appriou", "gallery": "CLEARING"},
    {"name": "Korakrit Arunanondchai", "gallery": "CLEARING"},
    {"name": "Sebastian Black", "gallery": "CLEARING"},
    {"name": "Koenraad Dedobbeleer", "gallery": "CLEARING"},
    {"name": "Daniel Dewar & Grégory Gicquel", "gallery": "CLEARING"},
    {"name": "Ryan Foerster", "gallery": "CLEARING"},
    {"name": "Aaron Garber-Maikovska", "gallery": "CLEARING"},
    {"name": "Hugh Hayden", "gallery": "CLEARING"},
    {"name": "Marguerite Humeau", "gallery": "CLEARING"},
    {"name": "Zak Kitnick", "gallery": "CLEARING"},
    {"name": "Calvin Marcus", "gallery": "CLEARING"},
    {"name": "Marina Pinsky", "gallery": "CLEARING"},
    {"name": "Loïc Raguénès", "gallery": "CLEARING"},
    {"name": "Lili Reynaud-Dewar", "gallery": "CLEARING"},
    # Additional artists
    {"name": "Adam Alessi", "gallery": "CLEARING"},
    {"name": "Gabrielė Adomaitytė", "gallery": "CLEARING"},
    {"name": "Javier Barrios", "gallery": "CLEARING"},
    {"name": "Meriem Bennani", "gallery": "CLEARING"},
    {"name": "Huma Bhabha", "gallery": "CLEARING"},
    {"name": "Sara Flores", "gallery": "CLEARING"},
    {"name": "Sedrick Chisom", "gallery": "CLEARING"},
    {"name": "Henry Curchod", "gallery": "CLEARING"},
    {"name": "Shota Nakamura", "gallery": "CLEARING"},
    {"name": "Daisy Sheff", "gallery": "CLEARING"},
    {"name": "Robert Zehnder", "gallery": "CLEARING"},
]


def load_existing_csv(csv_path):
    """Load existing consolidated CSV into a dictionary."""
    artists = defaultdict(lambda: {
        "id": "",
        "name": "",
        "slug": "",
        "nationality": "",
        "birth_year": "",
        "website": "",
        "instagram": "",
        "instagram_followers": "",
        "galleries_exhibited": "",
        "cv_url": "",
    })

    if not csv_path.exists():
        return artists

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row.get("name"):
                continue
            name = row["name"].strip()
            artists[name] = row

    return artists


def merge_clearing_artists(existing_artists, clearing_artists):
    """Merge CLEARING artists into existing data."""
    for artist in clearing_artists:
        name = artist["name"]

        # Only add if artist doesn't already exist
        if name not in existing_artists:
            existing_artists[name] = {
                "id": "",
                "name": name,
                "slug": "",
                "nationality": "",
                "birth_year": "",
                "website": "",
                "instagram": "",
                "instagram_followers": "",
                "galleries_exhibited": artist["gallery"],
                "cv_url": "",
            }
        else:
            # Add gallery if not already there
            galleries = existing_artists[name].get("galleries_exhibited", "")
            if galleries and artist["gallery"] not in galleries:
                galleries += f", {artist['gallery']}"
            elif not galleries:
                galleries = artist["gallery"]
            existing_artists[name]["galleries_exhibited"] = galleries

    return existing_artists


def write_consolidated_csv(csv_path, artists):
    """Write merged data to consolidated CSV."""
    fieldnames = [
        "id", "name", "slug", "nationality", "birth_year",
        "website", "instagram", "instagram_followers",
        "galleries_exhibited", "cv_url"
    ]

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        # Sort by name for consistency
        for name in sorted(artists.keys()):
            writer.writerow(artists[name])


def main():
    csv_path = Path("/Users/adamaslan/code/zxy3/data/artists-consolidated.csv")

    print(f"📖 Loading existing CSV: {csv_path.name}")
    existing = load_existing_csv(csv_path)
    initial_count = len([a for a in existing.values() if a.get("name")])
    print(f"   Found {initial_count} existing artists")

    print(f"\n➕ Merging {len(CLEARING_ARTISTS)} CLEARING gallery artists...")
    merged = merge_clearing_artists(existing, CLEARING_ARTISTS)

    # Count new artists
    new_count = len([a for a in merged.values() if a.get("name")]) - initial_count
    print(f"   Added {new_count} new artists")

    print(f"\n💾 Writing consolidated CSV...")
    write_consolidated_csv(csv_path, merged)

    total = len([a for a in merged.values() if a.get("name")])
    print(f"✅ Complete! Total artists: {total}")
    print(f"   File: {csv_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
