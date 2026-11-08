// Lab 2: SQLite database and CRUD routes.
// Run with: npm run dev   (nodemon, restarts on every change)
//           npm start     (plain node)
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Hosted platforms give the app a read-only filesystem apart from /tmp, so the
// committed database is copied there once per instance and every write goes to
// that copy. Locally the project's own books.db is used directly.
const IS_DEPLOYED = Boolean(process.env.VERCEL);
const DB_FILE = IS_DEPLOYED
  ? path.join("/tmp", "books.db")
  : path.join(__dirname, "books.db");

const createDatabase = async () => {
  if (IS_DEPLOYED && !fs.existsSync(DB_FILE)) {
    fs.copyFileSync(path.join(__dirname, "books.db"), DB_FILE);
  }

  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL,
      pages INTEGER NOT NULL
    );
  `);

  return db;
};

// The connection is opened once, when this module loads, and every request
// waits for that promise before touching the database. Without the await the
// handlers could run before `db` exists - it fails on a cold serverless start
// and is the bug I hit first.
const databaseReady = createDatabase();
databaseReady.catch((error) => {
  console.error(`Database error: ${error.message}`);
});

app.use(async (request, response, next) => {
  try {
    request.db = await databaseReady;
    next();
  } catch (error) {
    response.status(500).json({ message: "Database is unavailable" });
  }
});

// A book id must be a positive whole number.
const isPositiveInteger = (value) => /^[1-9]\d*$/.test(String(value));

// Every field is required and must have the right type.
const validateBook = (body = {}) => {
  const { title, author, price, pages } = body;

  if (typeof title !== "string" || title.trim() === "") {
    return "title is required";
  }
  if (typeof author !== "string" || author.trim() === "") {
    return "author is required";
  }
  if (!Number.isInteger(price) || price < 0) {
    return "price must be a non-negative whole number";
  }
  if (!Number.isInteger(pages) || pages <= 0) {
    return "pages must be a positive whole number";
  }

  return null;
};

// GET /books/ -> every book
app.get("/books/", async (request, response) => {
  try {
    const books = await request.db.all("SELECT * FROM book ORDER BY id;");
    response.status(200).json(books);
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// GET /books/:bookId/ -> one book
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;

  if (!isPositiveInteger(bookId)) {
    return response
      .status(400)
      .json({ message: "Book id must be a positive whole number" });
  }

  try {
    const book = await request.db.get("SELECT * FROM book WHERE id = ?;", [
      bookId
    ]);

    if (!book) {
      return response.status(404).json({ message: "Book not found" });
    }

    response.status(200).json(book);
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// POST /books/ -> add a book
app.post("/books/", async (request, response) => {
  const invalid = validateBook(request.body);

  if (invalid) {
    return response.status(400).json({ message: invalid });
  }

  try {
    const { title, author, price, pages } = request.body;
    const result = await request.db.run(
      "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);",
      [title.trim(), author.trim(), price, pages]
    );

    response.status(201).json({
      message: "Book added successfully",
      bookId: result.lastID
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// PUT /books/:bookId/ -> replace every field of an existing book
app.put("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;

  if (!isPositiveInteger(bookId)) {
    return response
      .status(400)
      .json({ message: "Book id must be a positive whole number" });
  }

  const invalid = validateBook(request.body);

  if (invalid) {
    return response.status(400).json({ message: invalid });
  }

  try {
    const existing = await request.db.get("SELECT id FROM book WHERE id = ?;", [
      bookId
    ]);

    if (!existing) {
      return response.status(404).json({ message: "Book not found" });
    }

    const { title, author, price, pages } = request.body;
    await request.db.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;",
      [title.trim(), author.trim(), price, pages, bookId]
    );

    response.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /books/:bookId/ -> remove a book
app.delete("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;

  if (!isPositiveInteger(bookId)) {
    return response
      .status(400)
      .json({ message: "Book id must be a positive whole number" });
  }

  try {
    const existing = await request.db.get("SELECT id FROM book WHERE id = ?;", [
      bookId
    ]);

    if (!existing) {
      return response.status(404).json({ message: "Book not found" });
    }

    await request.db.run("DELETE FROM book WHERE id = ?;", [bookId]);

    response.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Internal server error" });
  }
});

// Unknown route -> 404, same JSON shape as every other response
app.use((request, response) => {
  response.status(404).json({ message: "Route not found" });
});

// Malformed JSON in the body -> 400 instead of Express's HTML error page
app.use((error, request, response, next) => {
  if (error.type === "entity.parse.failed") {
    return response
      .status(400)
      .json({ message: "Request body must be valid JSON" });
  }

  console.error(error);
  response.status(500).json({ message: "Internal server error" });
});

// Start listening only after the database is open, and only when this file is
// the entry point (Vercel imports the app instead).
if (require.main === module) {
  databaseReady
    .then(() => {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(() => process.exit(1));
}

module.exports = app;
