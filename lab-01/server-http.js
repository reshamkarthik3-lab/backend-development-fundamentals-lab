// Lab 1, task 3: a plain Node.js web server using the built-in http module.
// Run with: npm run http   (listens on port 3000)
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Hello");
});

server.listen(PORT, () => {
  console.log(`http server running at http://localhost:${PORT}`);
});
