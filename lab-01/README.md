# Lab 1: Node.js and Express server

**Resham Karthik** · Registration number **252U1R7085** · Section **CSE FSD 2B 309**

Course: Backend Development Fundamentals — Year II Term II — Aurora
Faculty: Joel Prashanth D

## Objective

Set up a Node.js project and build the same small web server twice: first with the built-in `http` module, then with Express. The Express version exposes three routes and answers every unknown path with a 404 message.

## Technologies used

- Node.js (v18 or later)
- Express.js 4
- JavaScript
- npm
- VS Code
- Postman (response checks)

## Project structure

```text
lab-01/
├── api/
│   └── index.js           # Vercel entry point (imports the Express app)
├── screenshots/
│   ├── home.png
│   ├── about.png
│   ├── time.png
│   └── not-found.png
├── .gitignore
├── package.json
├── package-lock.json
├── server-http.js         # built-in http module server
├── server.js              # Express server
├── vercel.json            # sends every request to api/index.js
└── README.md
```

## How to run

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

To run the plain `http` module version instead:

```bash
npm run http
```

Stop a running server with `Ctrl + C` before starting the other one, because both use the same port.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port the server listens on. Falls back to `3000` when it is not set. |

No other environment variables or secrets are used, so there is no `.env` file to create. Nothing sensitive is committed.

## Endpoints

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/` | Returns the welcome text. | 200 OK |
| GET | `/about` | Returns my name, registration number and section as JSON. | 200 OK |
| GET | `/time` | Returns the current date and time as JSON, generated with `new Date()`. | 200 OK |
| GET | anything else | Returns `404 - Page not found`. | 404 Not Found |

The plain `http` server in `server-http.js` answers every request with `Hello` and status `200`.

```text
GET /                     -> 200
GET /about                -> 200
GET /time                 -> 200
GET /unknown-route        -> 404
```

## Screenshots

Every capture below is a real response from the server running on `http://localhost:3000`.

### 1. Home route — `GET /`

![Home route](./screenshots/home.png)

### 2. About route — `GET /about`

![About route](./screenshots/about.png)

### 3. Time route — `GET /time`

![Time route](./screenshots/time.png)

### 4. Unknown route — 404

![Unknown route](./screenshots/not-found.png)

## Rules followed

- `node_modules` is not committed; it is excluded by `.gitignore`.
- No `.env` file or secret value is committed.
- Every route returns the correct status code (200 for the three routes, 404 for unknown paths).
- The Express app is exported as well as started, so the same file works locally and on Vercel.
