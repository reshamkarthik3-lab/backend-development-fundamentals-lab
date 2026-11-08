// Runs every documented request against the locally running lab servers,
// records the real status code and body, and renders one capture card per
// request. Cards are a fixed height so a single full-page screenshot can be
// sliced into the individual screenshots used by the lab reports.
//
// Usage:  node tools/capture.js        (servers must already be running)
const fs = require("fs");
const path = require("path");
const http = require("http");

const OUT_DIR = path.join(__dirname, "out");
const PORT = 8099;

const LABS = [
  {
    id: "lab-01",
    title: "Lab 1 - Node.js and Express server",
    base: "http://localhost:3000",
    cases: [
      { file: "home", label: "GET /", method: "GET", url: "/" },
      { file: "about", label: "GET /about", method: "GET", url: "/about" },
      { file: "time", label: "GET /time", method: "GET", url: "/time" },
      {
        file: "not-found",
        label: "GET /unknown-route",
        method: "GET",
        url: "/unknown-route"
      }
    ]
  },
  {
    id: "lab-02",
    title: "Lab 2 - SQLite database and CRUD routes",
    base: "http://localhost:3001",
    cases: [
      {
        file: "db-before",
        label: "Rows in books.db before testing",
        method: "GET",
        url: "/books/"
      },
      { file: "get-all", label: "GET /books/", method: "GET", url: "/books/" },
      {
        file: "get-one",
        label: "GET /books/1/",
        method: "GET",
        url: "/books/1/"
      },
      {
        file: "post",
        label: "POST /books/",
        method: "POST",
        url: "/books/",
        body: {
          title: "The Pragmatic Programmer",
          author: "Andrew Hunt",
          price: 500,
          pages: 352
        }
      },
      {
        file: "put",
        label: "PUT /books/1/",
        method: "PUT",
        url: "/books/1/",
        body: {
          title: "Atomic Habits",
          author: "James Clear",
          price: 549,
          pages: 320
        }
      },
      {
        file: "delete",
        label: "DELETE /books/10/",
        method: "DELETE",
        url: "/books/10/"
      },
      {
        file: "error-404",
        label: "GET /books/999/",
        method: "GET",
        url: "/books/999/"
      },
      {
        file: "error-400",
        label: "GET /books/abc/",
        method: "GET",
        url: "/books/abc/"
      },
      {
        file: "db-after",
        label: "Rows in books.db after testing",
        method: "GET",
        url: "/books/"
      }
    ]
  },
  {
    id: "lab-03",
    title: "Lab 3 - REST API, query parameters, validation",
    base: "http://localhost:3002",
    cases: [
      {
        file: "db-before",
        label: "Rows in books.db before testing",
        method: "GET",
        url: "/books/"
      },
      { file: "get-all", label: "GET /books/", method: "GET", url: "/books/" },
      {
        file: "query-search",
        label: "GET /books/?search_q=habit",
        method: "GET",
        url: "/books/?search_q=habit"
      },
      {
        file: "query-price-filter",
        label: "GET /books/?min_price=300&max_price=400",
        method: "GET",
        url: "/books/?min_price=300&max_price=400"
      },
      {
        file: "query-filter-sort",
        label: "GET /books/?order_by=price&order=DESC&limit=3",
        method: "GET",
        url: "/books/?order_by=price&order=DESC&limit=3"
      },
      {
        file: "query-pagination",
        label: "GET /books/?limit=2&offset=8",
        method: "GET",
        url: "/books/?limit=2&offset=8"
      },
      {
        file: "get-one",
        label: "GET /books/1/",
        method: "GET",
        url: "/books/1/"
      },
      {
        file: "post",
        label: "POST /books/",
        method: "POST",
        url: "/books/",
        body: {
          title: "The Pragmatic Programmer",
          author: "Andrew Hunt",
          price: 500,
          pages: 352
        }
      },
      {
        file: "post-missing-author",
        label: "POST /books/ (no author)",
        method: "POST",
        url: "/books/",
        body: { title: "Untitled Book", price: 300, pages: 200 }
      },
      {
        file: "post-bad-price",
        label: "POST /books/ (price is text)",
        method: "POST",
        url: "/books/",
        body: {
          title: "Untitled Book",
          author: "Someone",
          price: "free",
          pages: 200
        }
      },
      {
        file: "put",
        label: "PUT /books/1/",
        method: "PUT",
        url: "/books/1/",
        body: {
          title: "Atomic Habits",
          author: "James Clear",
          price: 549,
          pages: 320
        }
      },
      {
        file: "delete",
        label: "DELETE /books/10/",
        method: "DELETE",
        url: "/books/10/"
      },
      {
        file: "invalid-id",
        label: "GET /books/abc/",
        method: "GET",
        url: "/books/abc/"
      },
      {
        file: "bad-query-param",
        label: "GET /books/?order_by=price;DROP TABLE book",
        method: "GET",
        url: "/books/?order_by=" + encodeURIComponent("price;DROP TABLE book")
      },
      {
        file: "errors-404",
        label: "GET /books/999/",
        method: "GET",
        url: "/books/999/"
      },
      {
        file: "db-after",
        label: "Rows in books.db after testing",
        method: "GET",
        url: "/books/"
      }
    ]
  }
];

const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error"
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const isFlatObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (field) => field === null || typeof field !== "object"
  );

const inlineObject = (value) =>
  "{ " +
  Object.entries(value)
    .map(([key, field]) => `"${key}": ${JSON.stringify(field)}`)
    .join(", ") +
  " }";

// Readable JSON with one line per record, so a 10-row response still fits in
// a single capture card.
const formatJson = (value, depth = 0) => {
  const padding = "  ".repeat(depth);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    if (value.every(isFlatObject)) {
      const rows = value.map(
        (item) => "  ".repeat(depth + 1) + inlineObject(item)
      );
      return "[\n" + rows.join(",\n") + "\n" + padding + "]";
    }

    return (
      "[\n" +
      value
        .map((item) => "  ".repeat(depth + 1) + formatJson(item, depth + 1))
        .join(",\n") +
      "\n" +
      padding +
      "]"
    );
  }

  if (isFlatObject(value)) {
    const rows = Object.entries(value).map(
      ([key, field]) =>
        "  ".repeat(depth + 1) + `"${key}": ${JSON.stringify(field)}`
    );
    return "{\n" + rows.join(",\n") + "\n" + padding + "}";
  }

  return JSON.stringify(value, null, 2);
};

const renderBody = (text) => {
  try {
    return formatJson(JSON.parse(text));
  } catch {
    return text;
  }
};

const renderCard = (lab, entry, result) => {
  const statusClass =
    result.status < 300 ? "ok" : result.status < 500 ? "warn" : "bad";
  const statusText = STATUS_TEXT[result.status] || "";
  const requestBlock = entry.body
    ? `<div class="label">Request body</div>
       <pre class="req">${escapeHtml(formatJson(entry.body))}</pre>`
    : "";

  return `<section class="card">
  <div class="top">
    <span class="method ${entry.method.toLowerCase()}">${entry.method}</span>
    <span class="url">${escapeHtml(lab.base + entry.url)}</span>
    <span class="status ${statusClass}">${result.status} ${statusText}</span>
  </div>
  <div class="sub">${escapeHtml(lab.title)} &middot; ${escapeHtml(
    entry.label
  )} &middot; captured ${result.capturedAt} from the local server</div>
  ${requestBlock}
  <div class="label">Response body <span class="type">${escapeHtml(
    result.contentType
  )}</span></div>
  <pre class="res">${escapeHtml(renderBody(result.body))}</pre>
</section>`;
};

const callEndpoint = async (lab, entry) => {
  const headers = {};
  const options = { method: entry.method, headers };

  if (entry.body) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(entry.body);
  }

  const response = await fetch(lab.base + entry.url, options);
  const body = await response.text();

  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "text/plain",
    body,
    capturedAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    })
  };
};

const page = (lab, cards) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(lab.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; width: 1000px; background: #ffffff;
         font-family: "Segoe UI", system-ui, sans-serif; color: #1f2933; }
  .card { height: 620px; padding: 18px 24px; border-bottom: 1px solid #e4e7eb;
          overflow: hidden; }
  .top { display: flex; align-items: center; gap: 12px; }
  .method { font: 700 12px/1 "Segoe UI", sans-serif; letter-spacing: .06em;
            padding: 7px 10px; border-radius: 6px; background: #e8f0fe; color: #1a56db; }
  .method.post { background: #e6f4ea; color: #137333; }
  .method.put { background: #fef7e0; color: #a05c00; }
  .method.delete { background: #fce8e6; color: #b3261e; }
  .url { font: 13px/1.4 Consolas, monospace; color: #3e4c59; flex: 1;
         overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status { font: 700 12px/1 "Segoe UI", sans-serif; padding: 7px 10px;
            border-radius: 6px; }
  .status.ok { background: #e6f4ea; color: #137333; }
  .status.warn { background: #fef7e0; color: #a05c00; }
  .status.bad { background: #fce8e6; color: #b3261e; }
  .sub { margin: 10px 0 14px; font-size: 11px; color: #7b8794; }
  .label { font: 700 10px/1.4 "Segoe UI", sans-serif; letter-spacing: .08em;
           text-transform: uppercase; color: #9aa5b1; margin: 0 0 5px; }
  .type { font-weight: 400; letter-spacing: 0; text-transform: none;
          color: #b0b8c1; margin-left: 8px; }
  pre { margin: 0 0 14px; padding: 12px 14px; background: #f7f8fa;
        border: 1px solid #e4e7eb; border-radius: 8px;
        font: 10px/1.32 Consolas, "Courier New", monospace; color: #22303c;
        white-space: pre-wrap; overflow: hidden; }
  pre.req { max-height: 132px; }
  pre.res { max-height: 372px; }
</style>
</head>
<body>
${cards.join("\n")}
</body>
</html>`;

const main = async () => {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const summary = {};

  for (const lab of LABS) {
    const cards = [];
    summary[lab.id] = [];

    for (const entry of lab.cases) {
      let result;
      try {
        result = await callEndpoint(lab, entry);
      } catch (error) {
        result = {
          status: 0,
          contentType: "network error",
          body: error.message,
          capturedAt: new Date().toISOString()
        };
      }

      summary[lab.id].push({
        file: entry.file,
        method: entry.method,
        url: entry.url,
        status: result.status,
        body: result.body
      });

      cards.push(renderCard(lab, entry, result));
    }

    fs.writeFileSync(
      path.join(OUT_DIR, `${lab.id}.html`),
      page(lab, cards),
      "utf8"
    );
    console.log(`${lab.id}: ${cards.length} captures`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "results.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  // Card order per lab, so the slicing step knows each image's file name.
  const order = Object.fromEntries(
    Object.entries(summary).map(([id, rows]) => [id, rows.map((row) => row.file)])
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "order.json"),
    JSON.stringify(order, null, 2),
    "utf8"
  );

  // Serve the capture pages so a browser can screenshot them.
  http
    .createServer((request, response) => {
      const name = path.basename(decodeURIComponent(request.url.split("?")[0]));
      const file = path.join(OUT_DIR, name);

      if (!fs.existsSync(file)) {
        response.writeHead(404).end("not found");
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(file).pipe(response);
    })
    .listen(PORT, () => {
      console.log(`capture pages on http://localhost:${PORT}/`);
    });
};

main();
