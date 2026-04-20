#!/usr/bin/env python3
"""
CLEARING Gallery artist extraction with location tracking.
Adds gallery entries as "CLEARING-NewYork", "CLEARING-LA", "CLEARING-Brussels", etc.
"""

import csv
import sys
from pathlib import Path
from collections import defaultdict
from typing import Set, Tuple

# Exhibition data with location information
EXHIBITIONS = [
    # 2024 - Meet me by the lake
    {
        "title": "Meet me by the lake",
        "date": "August 2, 2024 - September 6, 2024",
        "location": "CLEARING-NewYork",
        "artists": "Uri Aran, Michael Angelo Bala, Ellen Berkenblit, Nicholas Campbell, Ryan Foerster, Simone Griffin, Xingzi Gu, Lauren Anaïs Hussey, Marcus Jahmal, Nino Kapanadze, Tomasz Kowalski, Olivia van Kuiken, Jean-François Lauda, Tanya Merrill, Emma Helene Moriconi, Catherine Mulligan, Shota Nakamura, Jean Nipon, Oliver Osborne, Loïc Raguénès, Jessy Razafimandimby, Wilhelm Sasnal, Clayton Schiff, Daisy Sheff, Will Sheldon, Sof'ya Shpurova, Raphaela Simon, Thom Trojanowski, Tristan Unrau, Justin de Verteuil, Anne Wu, Coco Young, Leah Ke Yi Zheng"
    },
    {
        "title": "I Could Eat You – Part II",
        "date": "Recent",
        "location": "CLEARING-NewYork, CLEARING-LA",
        "artists": "Jean-Marie Appriou, Javier Barrios, Sebastian Black, Anderson Borba, Tiago Carneiro Da Cunha, Enzo Cucchi, Koenraad Dedobbeleer, Jos De Gruyter & Harald Thys, Daniel Dewar & Grégory Gicquel, Audrey Gair, Pablo Echaurren, Marguerite Humeau, Rodrigo Hernández, Luís Lázaro Matos, Cristiano Lenhardt, Renato Leotta, Rodrigo Matheus, Calvin Marcus, Sarah Morris, Carrie Moyer, Rivane Neuenschwander, Joanna Piotrowska, Loïc Raguénès, Buhlebezwe Siwani, Valeska Soares, Belén Uriel, Yuli Yamagata, Erika Verzutti, Luiz Zerbini"
    },
    {
        "title": "MAIDEN VOYAGE",
        "date": "April 26, 2023 - May 21, 2023",
        "location": "CLEARING-NewYork",
        "artists": "Gabrielė Adomaitytė, Adam Alessi, Harold Ancart, Jean-Marie Appriou, Korakrit Arunanondchai, Javier Barrios, Meriem Bennani, Huma Bhabha, Sebastian Black, Matt Copson, Koenraad Dedobbeleer, Daniel Dewar & Grégory Gicquel, Sara Flores, Ryan Foerster, Aaron Garber-Maikovska, Hugh Hayden, Marguerite Humeau, Zak Kitnick, Calvin Marcus, Shota Nakamura, Marina Pinsky, Loïc Raguénès, Lili Reynaud-Dewar, Daisy Sheff"
    },
    {
        "title": "OFTEN VARY NEVER CHANGE",
        "date": "2021",
        "location": "CLEARING-NewYork",
        "artists": "Jean-Marie Appriou, Korakrit Arunanondchai, Meriem Bennani, Sebastian Black, Koenraad Dedobbeleer, Daniel Dewar & Grégory Gicquel, Ryan Foerster, Aaron Garber-Maikovska, Chase Hall, Hugh Hayden, Marguerite Humeau, Zak Kitnick, Calvin Marcus, Marina Pinsky, Loïc Raguénès, Lili Reynaud-Dewar"
    },
    {
        "title": "LIFE STILL",
        "date": "July 22, 2021 - August 25, 2021",
        "location": "CLEARING-NewYork",
        "artists": "Harold Ancart, Jean-Marie Appriou, Korakrit Arunanondchai, Meriem Bennani, Sebastian Black, Lucy Bull, Sedrick Chisom, Koenraad Dedobbeleer, Hadi Fallahpisheh, Ryan Foerster, Aaron Garber-Maikovska, Louise Giovanelli, Chase Hall, Hugh Hayden, Jessie Homer French, Brook Hsu, Zak Kitnick, Calvin Marcus, Tanya Merrill, Ebecho Muslimova, Ben Noam, Marina Pinsky, Loïc Raguénès, Charlotte vander Borght, Anna Weyant"
    },
    {
        "title": "Historical Exhibitions (2020-2011)",
        "date": "2011-2020",
        "location": "CLEARING-NewYork, CLEARING-LA, CLEARING-Brussels",
        "artists": "Henry Curchod, Violet Dennison, Gritli Faulhaber, Pe Ferreira, Lloyd Foster, Jasmine Gregory, Samuel Haitz, Oji Haynes, Amanda van Hesteren, Louis Jacquot, Tobias Kaspar, Kristian Kragelund, Anne Libby, Andrew Luk, Mickael Marman, Gus Monday, Julien Monnerie, Shinoh Nam, Armando Nin, Kayode Ojo, Raffaela Naldi Rossano, Rita Siegfried, Larry Stanton, Marius Steiger, Unyimeabasi Udoh, Supawich Weesapen, Elzie Williams III, Robert Zehnder, Felix De Clercq, Nicholas Sullivan, Oshay Green, Eli Ping, Miranda Fengyuan Zhang, Stanislao Lepri, Valerie Keane, Blair Whiteford, Celia Vasquez Yui, Raque Ford, Hwi Hahm, Terence Koh, Megan Marrin, Melvin Way, Kenneth Bergfeld, Cheryl Donegan, Joan Jonas, Melike Kara, Trevor Shimizu, Janine Iversen, Peter Shear, Josip Novosel, Julia Yerger, Liz Craft, Zoe Barcza, Neïl Beloufa, Aki Goto, Eduardo Paolozzi, Germaine Richier, Walter Swennen, Louis Eisner, Aaron Aujla, Robert Janitz, Saâdane Afif, Bruno Gironcoli, Alfred d'Ursel, Liz Magor, Peter Fend, Henri Michaux, Rémy Zaugg, René Heyvaert, Hannah Levy, Myranda Gillies, Loup Sarion, Julien Meert, Isabelle Cornaro, Dorian Gaudin, Eyan Goldman, Sayre Gomez, Patrick Jackson, Jamian Juliano-Villani, Nancy Lupo, Sean Raspet, Jesse Stecklow, Anna-Sophie Berger, Matthew Langan Peck, Sebastien Bonin, Dylan Bailey, William Blake, Isaac Brest, Natalie Czech, Cooper Jacoby, Dylan Lynch, Kyle Thurman, Ben Schumacher, Linda Matalon, Viola Yeşiltaç, Egan Frantz, Robin Cameron, Esther Kläs, Thomas Fougeirol, Valentin Carron, Roland Flexner, Jacob Kassay, Kilian Rüthemann, Aaron Bobrow, Marc Camille Chaimowicz, Allison Katz, Redmond Entwistle, Raphael Zarka, Pol Taburet, Camille Blatrix, Antoine Espinasseau, Peter Wächtler, Sharif Farrag, Elizabeth Jaeger, JP Munro, Noah Towne, Laís Amaral, Emmanuel Louisnord Desir, Jane Dickson, Diane Severin Nguyen, Efrain Almeida, Gabriel Chaile, Jaime Welsh, Janaina Tschäpe, João Maria, Gusmão, Leda Catunda, Mauro Restiffe, Sheroanawe Hakihiiwe, Simon Evans™, Sergej Jensen, Elana Bowsher, Maximiliane Baumgartner, Whitney Claflin, Nora Kapfer, Laura Langer, Mimi Lauter, Patricio Lima Quintana, Laure Prouvost, Alan Schmalz, He Xiangyu, Urban Zellweger, Ghislaine Leung, Riccardo Paratore, Chadwick Rantanen, Heji Shin, Michael E. Smith, Tobias Spichtig, Carole Vanderlinden, Margaux Schwarz, David Weiss, Sveta Mordovskaya, Kasper Bosmans, Monster Chetwynd, Georgia Gardner Gray, Andrew LaMar Hopkins, George Gray, Spencer Sweeney, David Altmejd, Julie Curtiss, Louisa Gagliardi, Ser Serpas, Fin Simonetti, Sasha Gordon, Autumn Wallace, Valerie Keane, Chadwick Rantanen"
    },
]


def parse_artist_names(artist_string: str) -> Set[str]:
    """Parse comma/and-separated artist names from exhibition text."""
    text = artist_string.replace(" and ", ",")
    names = [name.strip() for name in text.split(",")]
    names = [n for n in names if n and len(n) > 1]
    names = [n.replace("™", "").strip() for n in names]
    return set(names)


def parse_locations(location_string: str) -> Set[str]:
    """Parse comma-separated locations."""
    locations = [loc.strip() for loc in location_string.split(",")]
    return set(locations)


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
    """Normalize names for deduplication."""
    return name.lower().strip()


def merge_clearing_artists_with_locations(existing_artists: dict, exhibitions: list) -> Tuple[dict, int, int]:
    """Extract all artists from exhibitions and track locations."""
    artist_locations = defaultdict(set)
    all_artists = set()

    # Extract and deduplicate artist names + locations
    for exhibition in exhibitions:
        artists = parse_artist_names(exhibition["artists"])
        locations = parse_locations(exhibition.get("location", "CLEARING-Unknown"))

        for artist in artists:
            all_artists.add(artist)
            artist_locations[artist].update(locations)

    print(f"📊 Unique artists extracted: {len(all_artists)}")

    new_count = 0
    # Merge into existing data
    for artist_name in sorted(all_artists):
        normalized = normalize_name(artist_name)
        locations = sorted(list(artist_locations[artist_name]))

        # Look for existing entry
        existing_key = None
        for existing_name in existing_artists.keys():
            if normalize_name(existing_name) == normalized:
                existing_key = existing_name
                break

        if existing_key:
            # Artist exists, merge gallery locations
            galleries = existing_artists[existing_key].get("galleries_exhibited", "")

            existing_galleries_list = [g.strip() for g in galleries.split(",") if g.strip()]
            existing_galleries_set = set(existing_galleries_list)
            existing_galleries_set.update(locations)

            # Remove generic "CLEARING" if location-specific ones exist
            if any(loc.startswith("CLEARING-") for loc in existing_galleries_set):
                existing_galleries_set.discard("CLEARING")

            galleries = ", ".join(sorted(existing_galleries_set))
            existing_artists[existing_key]["galleries_exhibited"] = galleries
        else:
            # New artist
            existing_artists[artist_name] = {
                "id": "",
                "name": artist_name,
                "slug": "",
                "nationality": "",
                "birth_year": "",
                "website": "",
                "instagram": "",
                "instagram_followers": "",
                "galleries_exhibited": ", ".join(sorted(locations)),
                "cv_url": "",
            }
            new_count += 1

    return existing_artists, len(all_artists), new_count


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

        for name in sorted(artists.keys()):
            if artists[name].get("name"):
                writer.writerow(artists[name])


def main():
    csv_path = Path("/Users/adamaslan/code/zxy3/data/artists-consolidated.csv")

    print("=" * 60)
    print("CLEARING Gallery - Artist Extraction with Locations")
    print("=" * 60)

    print(f"\n📖 Loading existing CSV: {csv_path.name}")
    existing = load_existing_csv(csv_path)
    initial_count = len([a for a in existing.values() if a.get("name")])
    print(f"   Found {initial_count} existing artists")

    print(f"\n🎨 Parsing {len(EXHIBITIONS)} exhibitions...")
    merged, unique_extracted, new_count = merge_clearing_artists_with_locations(existing, EXHIBITIONS)

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
