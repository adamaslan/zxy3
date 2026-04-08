#!/usr/bin/env node
/**
 * Dump data from CockroachDB to CSV via raw SQL queries
 * Usage: node scripts/dump-artworks.js [--table TABLE] [--format json]
 *        node scripts/dump-artworks.js --artists
 *        node scripts/dump-artworks.js --galleries
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const format = args.includes("--format") ? args[args.indexOf("--format") + 1] : "csv";
  const useArtists = args.includes("--artists");
  const useGalleries = args.includes("--galleries");
  const useArtworks = !useArtists && !useGalleries;

  try {
    let records = [];
    let tableName = "artworks";

    if (useArtists) {
      tableName = "artists";
      records = await prisma.$queryRaw`
        SELECT id, name, slug, nationality, birth_year, active, website, instagram
        FROM artists
        ORDER BY name
      `;
    } else if (useGalleries) {
      tableName = "galleries";
      records = await prisma.$queryRaw`
        SELECT id, name, slug, city, country, type, website
        FROM galleries
        ORDER BY name
      `;
    } else {
      // Artworks (with artist join)
      records = await prisma.$queryRaw`
        SELECT
          a.id,
          a.title,
          ar.name as artist_name,
          a.medium,
          a.medium_secondary,
          a.price_range,
          a.year,
          a.gallery_name,
          a.show_name
        FROM artworks a
        LEFT JOIN artists ar ON a.artist_id = ar.id
        ORDER BY a.createdAt DESC
      `;
    }

    // Serialize BigInt IDs to strings
    const serialized = records.map((record) => ({
      ...record,
      id: typeof record.id === "bigint" ? record.id.toString() : record.id,
    }));

    // Output
    const timestamp = new Date().toISOString().replace(/[:\-]/g, "").slice(0, 15);
    const dumpDir = path.join(process.cwd(), "dumps");

    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    if (format === "json") {
      const outPath = path.join(dumpDir, `${tableName}_${timestamp}.json`);
      fs.writeFileSync(outPath, JSON.stringify(serialized, null, 2));
      console.error(`✓ Exported ${serialized.length} ${tableName} to ${outPath}`);
    } else {
      // CSV format
      const csv = toCSV(serialized);
      const outPath = path.join(dumpDir, `${tableName}_${timestamp}.csv`);
      fs.writeFileSync(outPath, csv);
      console.error(`✓ Exported ${serialized.length} ${tableName} to ${outPath}`);

      // Print summary to stderr
      if (serialized.length > 0) {
        console.error(`  Records: ${serialized.length}`);
        if (tableName === "artworks" && serialized[0].artist_name) {
          const uniqueArtists = [...new Set(serialized.map((a) => a.artist_name).filter(Boolean))];
          const uniqueMediums = [...new Set(serialized.map((a) => a.medium).filter(Boolean))];
          console.error(`  Unique artists: ${uniqueArtists.length}`);
          console.error(`  Unique mediums: ${uniqueMediums.length}`);
        }
      } else {
        console.error(`  ⚠️  No ${tableName} found.`);
      }
    }

    // Also write to stdout for piping
    if (format === "csv") {
      console.log(toCSV(serialized));
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function toCSV(data) {
  if (!data.length) return "";

  // Dynamically determine headers from first record
  const headers = Object.keys(data[0]);

  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h] ?? "";
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const escaped = String(val).replace(/"/g, '""');
      const needsQuotes = escaped.includes(",") || escaped.includes("\n") || escaped.includes("\r") || String(val).includes('"');
      return needsQuotes ? `"${escaped}"` : escaped;
    })
  );

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

main();
