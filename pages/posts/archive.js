import Link from "next/link";
import Head from "next/head";
import Layout from "../../components/layout";
import { useState } from "react";

const SHOWS = [
  {
    year: 2025,
    title: "Horizonality",
    type: "Group Exhibition",
    image: "/horizon1.jpg",
    description:
      "Horizonality refers to the way soil naturally organizes itself into distinct horizontal layers over time. Just as soil has horizons and each unique plot of land its own specific horizonality, so too does an art exhibition. The ZXY Gallery spring exhibition “Horizonality” explored the various works as akin to soil in a continuous state of mixing new minerals, organisms, spring, and rain water.",
    artists: [
      { name: "Josie Girard", instagram: "rugratz4lyfe" },
      { name: "Theo Gaffney", instagram: "theophilusgaffney" },
      { name: "Rose Silberman-Gorn", instagram: "rosesilb" },
      { name: "Mallory Concetta Smith", instagram: "mallorywork" },
      { name: "Alice Herbert", instagram: "aliceaherbert" },
      { name: "Kelli Mcguire", instagram: "creepykelli" },
      { name: "Yue Yuan", instagram: "doitforthething" },
      { name: "Lucinda Graciela", instagram: "lucindagracielaceramics" },
      { name: "Michelle-B-Lin", instagram: "shellemi1" },
      { name: "Mia Grasso", instagram: "miagrasso__" },
      { name: "Goldfinch Bolton", instagram: "goldfinchbolton.studio" },
    ],
    performers: [
      { name: "Hero Magnus", instagram: "hero.magnus" },
      { name: "Adam Aslan", instagram: "nycpony" },
    ],
  },
  {
    year: 2025,
    title: "Paula De Martino & Rosalie Smith",
    type: "Two-Person Exhibition",
    image: null,
    description:
      "A two-person exhibition featuring multi-disciplinary artists Paula De Martino and Rosalie Smith at ZXY Gallery in Bushwick.",
    artists: [
      { name: "Paula De Martino", instagram: null },
      { name: "Rosalie Smith", instagram: null },
    ],
    performers: [],
  },
  {
    year: 2024,
    title: "Re-imagined Narrative",
    type: "Solo Exhibition",
    image: "/imagined2.jpg",
    description:
      "Explores the work of Roman Kalinovski. The paintings are inspired from digital and analog video stills bringing yet another new transformation of the original figure once optimized for view in a movie theater and now within the confines of oil on canvas.",
    artists: [{ name: "Roman Kalinovski", instagram: null }],
    performers: [],
  },
  {
    year: 2024,
    title: "Trad Medium",
    type: "Group Exhibition",
    image: "/tradmedium.jpeg",
    description:
      "ah yes…the trad medium…the trad use of material…the trad dichotomy of subject and object…the trad decision to figure or abstract…shall we try to escape it? no…not today…we will embrace it…study it…move forth…appreciating…the works…like a successful trad gallery ought to, should do…ZXY Gal at your trad service sir…",
    artists: [],
    performers: [],
  },
  {
    year: 2023,
    title: "Mayoween",
    type: "Group Exhibition",
    image: null,
    description: "A group exhibition and culinary journey. Featuring Kewpie Mayo.",
    artists: [
      { name: "Carolyn Colsant", instagram: "jkbutseriously" },
      { name: "Gunner Dongieux", instagram: "gunlagoon" },
      { name: "Karla Zurita", instagram: "karlakarlakarlazurita" },
      { name: "Julio Williams", instagram: "julio.cesar.williams" },
    ],
    performers: [],
  },
  {
    year: 2023,
    title: 'Atonement ||',
    type: "Group Exhibition",
    image: "/atone.jpeg",
    description:
      "The exhibition seeks to atone via bringing in works that are challenging for the gallery to show for various reasons.",
    artists: [],
    performers: [],
  },
  {
    year: 2023,
    title: "Invoking Pizza",
    type: "Group Exhibition",
    image: null,
    description:
      "Artists present disparate works deconstructing pizza creating a dialogue a posteriori of inherited tropes exposing latent meaning within pizza and without as pizza is shown to connect with a larger individual and societal sense of identity.",
    artists: [],
    performers: [],
  },
  {
    year: 2022,
    title: "Holiday Market",
    type: "Group Exhibition / Market",
    image: null,
    description: "ZXY Presents a variety of works perfect as Holiday Gifts.",
    artists: [],
    performers: [],
  },
  {
    year: 2022,
    title: "Meaning in Fragility",
    type: "Group Exhibition",
    image: null,
    description:
      'ZXY Gallery is pleased to announce its latest group exhibition, "Meaning in Fragility", featuring work by Stefanie Guerrero, Lesdavag, and Manuela Riestra. These works speak to the fragility of existence for those embracing contemporary values in a society fueled by problematic interests.',
    artists: [
      { name: "Stefanie Guerrero", instagram: null },
      { name: "Lesdavag", instagram: null },
      { name: "Manuela Riestra", instagram: null },
    ],
    performers: [],
  },
  {
    year: 2022,
    title: "Natural Ephemera",
    type: "Group Exhibition",
    image: null,
    description:
      "These works evocative of earthen material were presented on the heavenly confines of the ZXY Gallery roof. Highlighting displacement this exhibition speaks to identity questions often faced by individuals seeking a place of refuge.",
    artists: [],
    performers: [],
  },
  {
    year: 2022,
    title: "Sea Friends",
    type: "Group Exhibition",
    image: null,
    description:
      'Evoking the beauty and importance of the ocean\'s mysterious depths, the artists of "Sea Friends" bring together a strong vision of what goes into all the aspects of the sea.',
    artists: [],
    performers: [],
  },
];

const ALL_YEARS = [...new Set(SHOWS.map((s) => s.year))].sort((a, b) => b - a);
const ALL_TYPES = [...new Set(SHOWS.map((s) => s.type))].sort();

export default function Archive() {
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = SHOWS.filter((show) => {
    const matchYear = yearFilter === "all" || show.year === Number(yearFilter);
    const matchType = typeFilter === "all" || show.type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      show.title.toLowerCase().includes(q) ||
      show.description.toLowerCase().includes(q) ||
      show.artists.some((a) => a.name.toLowerCase().includes(q)) ||
      show.performers.some((p) => p.name.toLowerCase().includes(q));
    return matchYear && matchType && matchSearch;
  });

  return (
    <Layout>
      <Head>
        <title>Shows & Artist Archive — ZXY Gallery</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="A complete archive of all ZXY Gallery exhibitions and artists, Bushwick Brooklyn"
        />
        <meta
          property="og:image"
          content="https://res.cloudinary.com/adamaslan/image/upload/v1666992137/ZXY%20/zxy-logo_cos9hl.jpg"
        />
      </Head>

      <h1>Shows &amp; Artist Archive</h1>
      <p>
        A complete record of every ZXY Gallery exhibition in Bushwick, Brooklyn.
      </p>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="Search shows or artists…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Years</option>
          {ALL_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">All Types</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <p style={styles.count}>
        {filtered.length} show{filtered.length !== 1 ? "s" : ""}
      </p>

      <div style={styles.grid}>
        {filtered.map((show, i) => (
          <div key={i} style={styles.card}>
            {show.image && !show.image.endsWith(".MOV") && (
              <img
                src={show.image}
                alt={show.title}
                style={styles.cardImage}
              />
            )}
            <div style={styles.cardBody}>
              <span style={styles.tag}>{show.type}</span>
              <span style={styles.year}>{show.year}</span>
              <h2 style={styles.cardTitle}>{show.title}</h2>
              <p style={styles.desc}>{show.description}</p>

              {show.artists.length > 0 && (
                <>
                  <h4 style={styles.sectionLabel}>Artists</h4>
                  <ul style={styles.list}>
                    {show.artists.map((a, j) => (
                      <li key={j}>
                        {a.instagram ? (
                          <a
                            href={`https://www.instagram.com/${a.instagram}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {a.name}
                          </a>
                        ) : (
                          a.name
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {show.performers.length > 0 && (
                <>
                  <h4 style={styles.sectionLabel}>Performances &amp; Readings</h4>
                  <ul style={styles.list}>
                    {show.performers.map((p, j) => (
                      <li key={j}>
                        {p.instagram ? (
                          <a
                            href={`https://www.instagram.com/${p.instagram}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {p.name}
                          </a>
                        ) : (
                          p.name
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#999", marginTop: "2rem" }}>
          No shows match your search.
        </p>
      )}

      <p style={{ marginTop: "2rem" }}>
        Find more on our Instagram{" "}
        <a
          href="https://www.instagram.com/zxygallery/"
          target="_blank"
          rel="noopener noreferrer"
        >
          @zxygallery
        </a>
      </p>
      <h3>
        <Link href="/">Back to home</Link>
      </h3>
    </Layout>
  );
}

const styles = {
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    margin: "1.5rem 0 0.5rem",
  },
  searchInput: {
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    flexGrow: 1,
    minWidth: "200px",
  },
  select: {
    padding: "0.5rem 0.75rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "#fff",
    cursor: "pointer",
  },
  count: {
    color: "#666",
    fontSize: "0.9rem",
    margin: "0.25rem 0 1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    border: "1px solid #eaeaea",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 0.15s ease",
  },
  cardImage: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
  },
  cardBody: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    flex: 1,
  },
  tag: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#f30000c0",
    fontWeight: 600,
  },
  year: {
    fontSize: "0.8rem",
    color: "#999",
  },
  cardTitle: {
    margin: "0.25rem 0 0.5rem",
    fontSize: "1.25rem",
  },
  desc: {
    fontSize: "0.9rem",
    lineHeight: 1.5,
    color: "#444",
    margin: 0,
  },
  sectionLabel: {
    margin: "0.75rem 0 0.25rem",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#888",
  },
  list: {
    margin: 0,
    paddingLeft: "1.2rem",
    fontSize: "0.9rem",
    lineHeight: 1.7,
  },
};
