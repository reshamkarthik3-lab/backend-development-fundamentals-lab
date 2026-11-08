# Backend Development Fundamentals — Lab Reports

**Resham Karthik** · Registration number **252U1R7085** · Section **CSE FSD 2B 309**

Course: Backend Development Fundamentals — Year II Term II — Aurora
Faculty: Joel Prashanth D

This repository holds one folder per lab for the course. Each folder is a self-contained project with its own `README.md`, source code, Postman collection and screenshots.

## Lab index

| Lab | Title | Topics | Folder |
| --- | --- | --- | --- |
| Lab 01 | Node.js and Express server | Node.js `http` module, Express routing, status codes, 404 handling | [`lab-01/`](./lab-01) |
| Lab 02 | SQLite database and CRUD routes | SQLite, `sqlite`/`sqlite3`, parameterised queries, REST CRUD, status codes | [`lab-02/`](./lab-02) |
| Lab 03 | REST API, query parameters, validation | Search, sorting, pagination, price filters, input validation, consistent errors | [`lab-03/`](./lab-03) |

## Running any lab

```bash
cd lab-01
npm install
npm start
```

Each lab's `README.md` documents its own endpoints, environment variables and screenshots. The two SQLite labs also have `npm run seed -- --reset` to rebuild the database from `init.sql`.

## Rules followed in every lab

- `node_modules` is never committed; each folder has a `.gitignore`.
- `.env` files are never committed.
- Every route returns the correct HTTP status code.
- Database queries use parameterised statements, never string concatenation with user input.

## Repository layout notes

- `lab-0X/api/index.js` is the Vercel entry point; it exports the same Express app that `npm start` runs locally.
- `lab-02` and `lab-03` copy `books.db` to `/tmp` when running on Vercel, because the rest of the filesystem is read-only there. Changes made through the live deployment are therefore not permanent.
- `tools/` holds the helper scripts I used to record real responses from the running servers and turn them into the screenshots in each lab. It is development tooling and is not needed to run any lab.
