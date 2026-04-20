#!/usr/bin/env python3
"""
Comprehensive CLEARING Gallery artist extraction from exhibition history.
Parses chronological exhibitions and extracts all mentioned artists.
"""

import csv
import re
import sys
from pathlib import Path
from collections import defaultdict
from typing import Set

# Exhibition data from CLEARING website and user-provided text
EXHIBITIONS = [
    # 2024 - Meet me by the lake
    {
        "title": "Meet me by the lake",
        "date": "August 2, 2024 - September 6, 2024",
        "artists": "Uri Aran, Michael Angelo Bala, Ellen Berkenblit, Nicholas Campbell, Ryan Foerster, Simone Griffin, Xingzi Gu, Lauren Anaïs Hussey, Marcus Jahmal, Nino Kapanadze, Tomasz Kowalski, Olivia van Kuiken, Jean-François Lauda, Tanya Merrill, Emma Helene Moriconi, Catherine Mulligan, Shota Nakamura, Jean Nipon, Oliver Osborne, Loïc Raguénès, Jessy Razafimandimby, Wilhelm Sasnal, Clayton Schiff, Daisy Sheff, Will Sheldon, Sof'ya Shpurova, Raphaela Simon, Thom Trojanowski, Tristan Unrau, Justin de Verteuil, Anne Wu, Coco Young, Leah Ke Yi Zheng"
    },
    # I Could Eat You – Part II
    {
        "title": "I Could Eat You – Part II",
        "date": "Recent",
        "artists": "Jean-Marie Appriou, Javier Barrios, Sebastian Black, Anderson Borba, Tiago Carneiro Da Cunha, Enzo Cucchi, Koenraad Dedobbeleer, Jos De Gruyter & Harald Thys, Daniel Dewar & Grégory Gicquel, Audrey Gair, Pablo Echaurren, Marguerite Humeau, Rodrigo Hernández, Luís Lázaro Matos, Cristiano Lenhardt, Renato Leotta, Rodrigo Matheus, Calvin Marcus, Sarah Morris, Carrie Moyer, Rivane Neuenschwander, Joanna Piotrowska, Loïc Raguénès, Buhlebezwe Siwani, Valeska Soares, Belén Uriel, Yuli Yamagata, Erika Verzutti, Luiz Zerbini"
    },
    # MAIDEN VOYAGE
    {
        "title": "MAIDEN VOYAGE",
        "date": "April 26, 2023 - May 21, 2023",
        "artists": "Gabrielė Adomaitytė, Adam Alessi, Harold Ancart, Jean-Marie Appriou, Korakrit Arunanondchai, Javier Barrios, Meriem Bennani, Huma Bhabha, Sebastian Black, Matt Copson, Koenraad Dedobbeleer, Daniel Dewar & Grégory Gicquel, Sara Flores, Ryan Foerster, Aaron Garber-Maikovska, Hugh Hayden, Marguerite Humeau, Zak Kitnick, Calvin Marcus, Shota Nakamura, Marina Pinsky, Loïc Raguénès, Lili Reynaud-Dewar, Daisy Sheff"
    },
    # OFTEN VARY NEVER CHANGE
    {
        "title": "OFTEN VARY NEVER CHANGE",
        "date": "2021",
        "artists": "Jean-Marie Appriou, Korakrit Arunanondchai, Meriem Bennani, Sebastian Black, Koenraad Dedobbeleer, Daniel Dewar & Grégory Gicquel, Ryan Foerster, Aaron Garber-Maikovska, Chase Hall, Hugh Hayden, Marguerite Humeau, Zak Kitnick, Calvin Marcus, Marina Pinsky, Loïc Raguénès, Lili Reynaud-Dewar"
    },
    # LIFE STILL
    {
        "title": "LIFE STILL",
        "date": "July 22, 2021 - August 25, 2021",
        "artists": "Harold Ancart, Jean-Marie Appriou, Korakrit Arunanondchai, Meriem Bennani, Sebastian Black, Lucy Bull, Sedrick Chisom, Koenraad Dedobbeleer, Hadi Fallahpisheh, Ryan Foerster, Aaron Garber-Maikovska, Louise Giovanelli, Chase Hall, Hugh Hayden, Jessie Homer French, Brook Hsu, Zak Kitnick, Calvin Marcus, Tanya Merrill, Ebecho Muslimova, Ben Noam, Marina Pinsky, Loïc Raguénès, Charlotte vander Borght, Anna Weyant"
    },
    # Additional artists from comprehensive WebFetch
    {
        "title": "Historical Exhibitions (2020-2011)",
        "date": "2011-2020",
        "artists": "Henry Curchod, Violet Dennison, Gritli Faulhaber, Pe Ferreira, Lloyd Foster, Jasmine Gregory, Samuel Haitz, Oji Haynes, Amanda van Hesteren, Louis Jacquot, Tobias Kaspar, Kristian Kragelund, Anne Libby, Andrew Luk, Mickael Marman, Gus Monday, Julien Monnerie, Shinoh Nam, Armando Nin, Kayode Ojo, Raffaela Naldi Rossano, Rita Siegfried, Larry Stanton, Marius Steiger, Unyimeabasi Udoh, Supawich Weesapen, Elzie Williams III, Robert Zehnder, Felix De Clercq, Nicholas Sullivan, Oshay Green, Eli Ping, Miranda Fengyuan Zhang, Stanislao Lepri, Valerie Keane, Blair Whiteford, Celia Vasquez Yui, Raque Ford, Hwi Hahm, Terence Koh, Megan Marrin, Melvin Way, Kenneth Bergfeld, Cheryl Donegan, Joan Jonas, Melike Kara, Trevor Shimizu, Janine Iversen, Peter Shear, Josip Novosel, Julia Yerger, Liz Craft, Zoe Barcza, Neïl Beloufa, Aki Goto, Eduardo Paolozzi, Germaine Richier, Walter Swennen, Louis Eisner, Aaron Aujla, Robert Janitz, Saâdane Afif, Bruno Gironcoli, Alfred d'Ursel, Liz Magor, Peter Fend, Henri Michaux, Rémy Zaugg, René Heyvaert, Hannah Levy, Myranda Gillies, Loup Sarion, Julien Meert, Isabelle Cornaro, Dorian Gaudin, Eyan Goldman, Sayre Gomez, Patrick Jackson, Jamian Juliano-Villani, Nancy Lupo, Sean Raspet, Jesse Stecklow, Anna-Sophie Berger, Matthew Langan Peck, Sebastien Bonin, Dylan Bailey, William Blake, Isaac Brest, Natalie Czech, Cooper Jacoby, Dylan Lynch, Kyle Thurman, Ben Schumacher, Linda Matalon, Viola Yeşiltaç, Egan Frantz, Robin Cameron, Esther Kläs, Thomas Fougeirol, Valentin Carron, Roland Flexner, Jacob Kassay, Kilian Rüthemann, Aaron Bobrow, Marc Camille Chaimowicz, Allison Katz, Redmond Entwistle, Raphael Zarka, Pol Taburet, Camille Blatrix, Antoine Espinasseau, Peter Wächtler, Sharif Farrag, Elizabeth Jaeger, JP Munro, Noah Towne, Laís Amaral, Emmanuel Louisnord Desir, Jane Dickson, Diane Severin Nguyen, Efrain Almeida, Gabriel Chaile, Jaime Welsh, Janaina Tschäpe, João Maria, Gusmão, Leda Catunda, Mauro Restiffe, Sheroanawe Hakihiiwe, Simon Evans™, Sergej Jensen, Elana Bowsher, Maximiliane Baumgartner, Whitney Claflin, Nora Kapfer, Laura Langer, Mimi Lauter, Patricio Lima Quintana, Laure Prouvost, Alan Schmalz, He Xiangyu, Urban Zellweger, Ghislaine Leung, Riccardo Paratore, Chadwick Rantanen, Heji Shin, Michael E. Smith, Tobias Spichtig, Carole Vanderlinden, Margaux Schwarz, David Weiss, Sveta Mordovskaya, Kasper Bosmans, Monster Chetwynd, Georgia Gardner Gray, Andrew LaMar Hopkins, George Gray, Spencer Sweeney, David Altmejd, Julie Curtiss, Louisa Gagliardi, Ser Serpas, Fin Simonetti, Sasha Gordon, Autumn Wallace, Valerie Keane, Chadwick Rantanen"
    },
]


def parse_artist_names(artist_string: str) -> Set[str]:
    """
    Parse comma/and-separated artist names from exhibition text.
    Handles special cases like collaborative names.
    """
    # Replace " and " with comma for consistent splitting
    text = artist_string.replace(" and ", ",")

    # Split by comma
    names = [name.strip() for name in text.split(",")]

    # Clean up empty/whitespace entries
    names = [n for n in names if n and len(n) > 1]

    # Remove trademark/special symbols
    names = [n.replace("™", "").strip() for n in names]

    return set(names)


def load_existing_csv(csv_path: Path) -> dict:
    """Load existing consolidated CSV."""
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


def normalize_name(name: str) -> str:
    """Normalize names for deduplication (case-insensitive)."""
    return name.lower().strip()


def merge_clearing_artists(existing_artists: dict, exhibitions: list) -> dict:
    """Extract all artists from exhibitions and merge into existing data."""
    all_artists = set()
    seen_names = set()

    # Extract and deduplicate artist names
    for exhibition in exhibitions:
        artists = parse_artist_names(exhibition["artists"])
        all_artists.update(artists)

    print(f"📊 Unique artists extracted: {len(all_artists)}")

    # Merge into existing data
    for artist_name in sorted(all_artists):
        # Check if already exists (case-insensitive)
        normalized = normalize_name(artist_name)

        # Look for existing entry
        existing_key = None
        for existing_name in existing_artists.keys():
            if normalize_name(existing_name) == normalized:
                existing_key = existing_name
                break

        if existing_key:
            # Artist exists, update gallery info
            galleries = existing_artists[existing_key].get("galleries_exhibited", "")
            if galleries and "CLEARING" not in galleries:
                galleries += f", CLEARING"
            elif not galleries:
                galleries = "CLEARING"
            existing_artists[existing_key]["galleries_exhibited"] = galleries
            seen_names.add(existing_key)
        else:
            # New artist, add entry
            existing_artists[artist_name] = {
                "id": "",
                "name": artist_name,
                "slug": "",
                "nationality": "",
                "birth_year": "",
                "website": "",
                "instagram": "",
                "instagram_followers": "",
                "galleries_exhibited": "CLEARING",
                "cv_url": "",
            }
            seen_names.add(artist_name)

    return existing_artists, len(all_artists), len([n for n in seen_names if n not in existing_artists])


def write_consolidated_csv(csv_path: Path, artists: dict):
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
            if artists[name].get("name"):  # Skip empty rows
                writer.writerow(artists[name])


def main():
    csv_path = Path("/Users/adamaslan/code/zxy3/data/artists-consolidated.csv")

    print("=" * 60)
    print("CLEARING Gallery - Comprehensive Artist Extraction")
    print("=" * 60)

    print(f"\n📖 Loading existing CSV: {csv_path.name}")
    existing = load_existing_csv(csv_path)
    initial_count = len([a for a in existing.values() if a.get("name")])
    print(f"   Found {initial_count} existing artists")

    print(f"\n🎨 Parsing {len(EXHIBITIONS)} exhibitions...")
    merged, unique_extracted, new_count = merge_clearing_artists(existing, EXHIBITIONS)

    print(f"   Extracted {unique_extracted} unique CLEARING artists")
    print(f"   {new_count} new artists to add")

    print(f"\n💾 Writing consolidated CSV...")
    write_consolidated_csv(csv_path, merged)

    total = len([a for a in merged.values() if a.get("name")])
    print(f"\n✅ Complete!")
    print(f"   Total artists: {total} (was {initial_count})")
    print(f"   Added: +{total - initial_count}")
    print(f"   File: {csv_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
