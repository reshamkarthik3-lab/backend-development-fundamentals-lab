# Lab 3: REST API, query parameters, validation, debugging

**Resham Karthik** · Registration number **252U1R7085** · Section **CSE FSD 2B 309**

Course: Backend Development Fundamentals — Year II Term II — Aurora
Faculty: Joel Prashanth D

## Live deployment

[Open Lab 3 on Render](https://bdf-lab-03-s4f0.onrender.com)

The free Render service may spin down after inactivity, so its first request can take 50 seconds or more. Its filesystem is ephemeral: create, update and delete work on the live service, but database changes can be lost after a restart or redeploy. Locally, changes stay in `books.db`.

## Objective

Turn the Lab 2 CRUD routes into a clean REST API: nouns in the paths, HTTP methods for the actions, search / sorting / pagination / price filters on `GET /books/`, strict validation of input, the correct status code for every case, and one JSON shape for every response.

## Technologies used

- Node.js (v18 or later)
- Express.js 4
- SQLite (`sqlite` and `sqlite3` packages)
- nodemon (development only)
- Postman
- SQLite command-line shell
- VS Code

## Project structure

```text
lab-03/
├── api/
│   └── index.js                  # Vercel entry point (imports the Express app)
├── screenshots/
│   ├── db-before.png
│   ├── get-all.png
│   ├── query-search.png
│   ├── query-price-filter.png
│   ├── query-filter-sort.png
│   ├── query-pagination.png
│   ├── get-one.png
│   ├── post.png
│   ├── post-missing-author.png
│   ├── post-bad-price.png
│   ├── put.png
│   ├── delete.png
│   ├── invalid-id.png
│   ├── bad-query-param.png
│   ├── errors-404.png
│   ├── db-after.png
│   └── postman-run.png
├── .gitignore
├── books.db                      # SQLite database file (10 starting rows)
├── init.sql                      # table definition and the 10 rows
├── package.json
├── package-lock.json
├── postman_collection.json       # 14 success and failure requests
├── seed.js                       # rebuilds books.db from init.sql
├── server.js                     # Express server with the API routes
├── vercel.json                   # sends every request to api/index.js
└── README.md
```

## How to run

```bash
npm install
npm run dev
```

`npm run dev` starts the server with nodemon. The terminal prints:

```text
Server running on port 3000
```

Use `npm start` to run it with plain Node. The API is then at `http://localhost:3000`.

### Database

`books.db` is committed, so the project works straight after cloning. To rebuild it:

```bash
sqlite3 books.db < init.sql
```

or, without the SQLite CLI:

```bash
npm run seed
npm run seed -- --reset
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port the server listens on. Falls back to `3000` when it is not set. |

No database password, API key or `.env` file is used.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Lists the available endpoints. |
| GET | `/books/` | Returns books, with optional search, filter, sort and pagination. |
| GET | `/books/:bookId/` | Returns one book by id. |
| POST | `/books/` | Creates a book and returns 201 with the new id. |
| PUT | `/books/:bookId/` | Replaces every field of an existing book. |
| DELETE | `/books/:bookId/` | Deletes a book. |

## Query parameters for `GET /books/`

| Parameter | Default | Description |
|---|---|---|
| `search_q` | empty | Partial, case-insensitive match on the title using `LIKE`. |
| `order_by` | `id` | Column to sort by: `id`, `title`, `author`, `price` or `pages`. |
| `order` | `ASC` | Sort direction: `ASC` or `DESC`. |
| `limit` | `10` | Maximum number of rows returned. |
| `offset` | `0` | Number of rows skipped, used with `limit` for pages. |
| `min_price` | `0` | Smallest price to include. |
| `max_price` | `1000000` | Largest price to include. |

Examples:

```text
/books/?search_q=habit
/books/?min_price=300&max_price=400&order_by=price&order=DESC
/books/?limit=2&offset=8
```

`order_by` is checked against a fixed list of column names, because a column name cannot be passed as a `?` placeholder. Every other user value still travels as a placeholder, and `%` / `_` inside `search_q` are escaped so they match literally instead of acting as wildcards.

## Status codes and error messages

Every response — success or failure — uses the same shape: `{ "message": "..." }`.

| Case | Status | Example message |
|---|---|---|
| Invalid `bookId` (not a positive whole number) | 400 | `Book id must be a positive whole number` |
| Missing or empty `title` | 400 | `title is required` |
| Missing or empty `author` | 400 | `author is required` |
| `price` not a whole number, or negative | 400 | `price must be a non-negative whole number` |
| `pages` missing, zero, negative or not a whole number | 400 | `pages must be a positive whole number` |
| Bad `order_by`, `order`, `limit`, `offset`, `min_price` or `max_price` | 400 | `order must be ASC or DESC` |
| `min_price` greater than `max_price` | 400 | `min_price cannot be greater than max_price` |
| Body is not valid JSON | 400 | `Request body must be valid JSON` |
| Book does not exist | 404 | `Book not found` |
| Unknown route | 404 | `Route not found` |
| Successful create | 201 | `Book added successfully` |
| Successful update or delete | 200 | `Book updated successfully` |

## Debugging exercise

The four faults in the broken version handed out for this lab, and the fix present in this project:

| Symptom | Cause | Fix |
|---|---|---|
| `Error: listen EADDRINUSE :::3000` on start | Another process (usually the previous server, or the `http` server from Lab 1) still held port 3000. | Stop the running server, or start on a free port with `PORT=3001 npm start`. The server already reads `process.env.PORT`. |
| `Error: Cannot find module './routes/books'` | The import path did not match the actual file layout. | Use the correct relative path (`./server` from `api/index.js`), and keep one entry file. |
| `SQLITE_ERROR: no such table: books` | The query used `books`, while the table is created as `book`. | The table name in every query matches the `CREATE TABLE book` statement. |
| Response body is empty or `undefined` in the handler | The database call was used without `await`, so a promise was read instead of the rows. | `await` every `db.all()`, `db.get()` and `db.run()` call before using its result. |

A fifth problem showed up on a cold start: the connection promise was not awaited before the first request, so handlers could run with a null `db`. The fix is the `databaseReady` promise that every request awaits.

## Testing

All 14 cases are in `postman_collection.json`: import it into Postman and press Send on each request. The collection variable `baseUrl` is `http://localhost:3000`.

| # | Request | Expected |
|---|---|---|
| 01 | `GET /books/` | 200, first 10 books |
| 02 | `GET /books/?search_q=habit` | 200, only titles containing "habit" |
| 03 | `GET /books/?min_price=300&max_price=400` | 200, four books in the range |
| 04 | `GET /books/?order_by=price&order=DESC&limit=3` | 200, the three most expensive first |
| 05 | `GET /books/?limit=2&offset=8` | 200, the last two rows |
| 06 | `GET /books/1/` | 200, one book |
| 07 | `POST /books/` valid body | 201, new id |
| 08 | `POST /books/` without `author` | 400, `author is required` |
| 09 | `POST /books/` with `"price": "free"` | 400, `price must be a non-negative whole number` |
| 10 | `PUT /books/1/` valid body | 200, updated |
| 11 | `DELETE /books/10/` | 200, deleted |
| 12 | `GET /books/999/` | 404, `Book not found` |
| 13 | `GET /books/abc/` | 400, invalid id |
| 14 | `GET /books/?order_by=price;DROP%20TABLE%20book` | 400, `order_by must be one of ...` |

The collection was also executed end to end with Postman's Newman runner: 14 requests, 0 failed.

![Postman collection run](./screenshots/postman-run.png)

## Screenshots

Every capture below is a real response from the server running on `http://localhost:3002`.

### Database before testing

The 10 starting rows, read back through `GET /books/`.

![Database before testing](./screenshots/db-before.png)

### GET /books/ — default query

![GET all books](./screenshots/get-all.png)

### Search — `?search_q=habit`

Partial title match with `LIKE`; only titles containing "habit" come back.

![Search by title](./screenshots/query-search.png)

### Price filter — `?min_price=300&max_price=400`

![Price filter](./screenshots/query-price-filter.png)

### Sort — `?order_by=price&order=DESC&limit=3`

The three most expensive books, highest first.

![Sort by price](./screenshots/query-filter-sort.png)

### Pagination — `?limit=2&offset=8`

Skips the first eight rows and returns two.

![Pagination](./screenshots/query-pagination.png)

### GET /books/1/ — one book

![GET one book](./screenshots/get-one.png)

### POST /books/ — create

![POST add book](./screenshots/post.png)

### POST /books/ — missing author

![POST missing author](./screenshots/post-missing-author.png)

### POST /books/ — price is not a number

A string in `price` is rejected with 400.

![POST bad price](./screenshots/post-bad-price.png)

### PUT /books/1/ — update

![PUT update book](./screenshots/put.png)

### DELETE /books/10/ — delete

![DELETE book](./screenshots/delete.png)

### GET /books/abc/ — invalid id

A non-numeric id returns 400, not 404.

![Invalid id](./screenshots/invalid-id.png)

### GET /books/ — bad query parameter

An `order_by` value that is not a column name returns 400 instead of reaching the database.

![Bad query parameter](./screenshots/bad-query-param.png)

### GET /books/999/ — not found

![Not found](./screenshots/errors-404.png)

### Database after testing

Row 1 is updated, row 10 is deleted, and the book created with POST is row 11.

![Database after testing](./screenshots/db-after.png)

## Rules followed

- `node_modules` is not committed; each folder has its own `.gitignore`.
- No `.env` file or secret value is committed.
- Every route returns the correct status code.
- Every database query is parameterised; the only interpolated value is `order_by`, taken from a fixed allow-list.
