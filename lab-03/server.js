// Lab 3: REST API with query parameters, validation and consistent errors.
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

// One connection, opened when the module loads; every request awaits it so a
// cold start can never hand a handler a null database.
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

// A column name cannot be sent as a ? placeholder, so sorting is limited to
// this list and the value is never concatenated from raw user input.
const ORDER_BY_COLUMNS = ["id", "title", "author", "price", "pages"];

const isPositiveInteger = (value) => /^[1-9]\d*$/.test(String(value));

// % and _ are wildcards inside LIKE, so a search term that contains them is
// escaped before it reaches the query.
const escapeLike = (value) => String(value).replace(/[\\%_]/g, "\\$&");

// Query string values always arrive as text, so numbers are parsed and
// rejected explicitly instead of relying on implicit conversion.
const readCount = (value, name, fallback) => {
  if (value === undefined) {
    return { value: fallback };
  }

  if (!/^\d+$/.test(String(value))) {
    return { error: `${name} must be a whole number` };
  }

  return { value: Number(value) };
};

const readAmount = (value, name, fallback) => {
  if (value === undefined) {
    return { value: fallback };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
    return { error: `${name} must be a number` };
  }

  return { value: Number(value) };
};

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

// GET / -> what the API offers
app.get("/", (request, response) => {
  response.status(200).json({
    message: "Book Store API is running",
    endpoints: [
      "GET /books/",
      "GET /books/:bookId/",
      "POST /books/",
      "PUT /books/:bookId/",
      "DELETE /books/:bookId/"
    ]
  });
});

// GET /books/ -> search, price filter, sort and pagination
app.get("/books/", async (request, response) => {
  const searchQ =
    request.query.search_q === undefined ? "" : String(request.query.search_q);

  const orderBy = String(request.query.order_by || "id").toLowerCase();

  if (!ORDER_BY_COLUMNS.includes(orderBy)) {
    return response.status(400).json({
      message: `order_by must be one of: ${ORDER_BY_COLUMNS.join(", ")}`
    });
  }

  const order = String(request.query.order || "ASC").toUpperCase();

  if (order !== "ASC" && order !== "DESC") {
    return response.status(400).json({ message: "order must be ASC or DESC" });
  }

  const limit = readCount(request.query.limit, "limit", 10);
  if (limit.error) {
    return response.status(400).json({ message: limit.error });
  }

  const offset = readCount(request.query.offset, "offset", 0);
  if (offset.error) {
    return response.status(400).json({ message: offset.error });
  }

  const minPrice = readAmount(request.query.min_price, "min_price", 0);
  if (minPrice.error) {
    return response.status(400).json({ message: minPrice.error });
  }

  const maxPrice = readAmount(request.query.max_price, "max_price", 1000000);
  if (maxPrice.error) {
    return response.status(400).json({ message: maxPrice.error });
  }

  if (minPrice.value > maxPrice.value) {
    return response.status(400).json({
      message: "min_price cannot be greater than max_price"
    });
  }

  try {
    const booksQuery = `
      SELECT *
      FROM book
      WHERE title LIKE ? ESCAPE '\\'
        AND price >= ?
        AND price <= ?
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?;
    `;

    const books = await request.db.all(booksQuery, [
      `%${escapeLike(searchQ)}%`,
      minPrice.value,
      maxPrice.value,
      limit.value,
      offset.value
    ]);

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

// POST /books/ -> create a book
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

// Unknown route -> 404 with the same JSON shape as every other error
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

// Listen only when this file is the entry point, and only after the database
// is open (Vercel imports the app instead of running it).
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
