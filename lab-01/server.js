// Lab 1, tasks 4-7: the same server from server-http.js, rebuilt with Express.
// Run with: npm start   (port 3000, or $PORT when deployed)
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// GET / -> plain welcome text
app.get("/", (request, response) => {
  response.status(200).send("Welcome to Lab 1: Node.js and Express server");
});

// GET /about -> my name and section as JSON
app.get("/about", (request, response) => {
  response.status(200).json({
    name: "Resham Karthik",
    registrationNumber: "252U1R7085",
    section: "CSE FSD 2B 309"
  });
});

// GET /time -> the current date and time, generated per request
app.get("/time", (request, response) => {
  response.status(200).json({
    currentTime: new Date().toISOString()
  });
});

// Any other path -> 404
app.use((request, response) => {
  response.status(404).send("404 - Page not found");
});

// Listen only when this file is run directly. Vercel imports the app instead
// and calls it as a serverless function.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
