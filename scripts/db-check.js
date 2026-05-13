#!/usr/bin/env node
/**
 * Check database schema and record counts
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("\n📊 Database Check\n");

    // Check mytable
    const count = await prisma.mytable.count();
    console.log(`✓ mytable: ${count} records`);

    if (count > 0) {
      // Show sample records
      const sample = await prisma.mytable.findMany({ take: 5 });
      console.log("\nSample records:");
      sample.forEach((record) => {
        console.log(
          `  - [${record.id}] ${record.artist} | ${record.medium1}${record.medium2 ? ", " + record.medium2 : ""} | ${record.price_range}`
        );
      });
    }

    // Check if there are other tables
    const allModels = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`\nAll tables in database:`);
    allModels.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\nCheck your DATABASE_URL in .env");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
