// Rebuilds books.db from init.sql without needing the SQLite CLI installed.
// Run with: npm run seed            (only if the table is empty)
//           npm run seed -- --reset (drop the table and re-insert the 10 rows)
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const DB_FILE = path.join(__dirname, "books.db");
const initSql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");

const seedDatabase = async () => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  try {
    if (process.argv.includes("--reset")) {
      await db.exec("DROP TABLE IF EXISTS book;");
      console.log("Existing book table dropped (--reset).");
    }

    await db.exec(initSql);

    const { count } = await db.get("SELECT COUNT(*) AS count FROM book;");
    console.log(`books.db is ready with ${count} rows.`);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
};

seedDatabase();
