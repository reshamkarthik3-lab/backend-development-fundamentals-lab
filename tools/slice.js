// Slices a full-page capture screenshot into one PNG per card. Every card is
// exactly CARD_HEIGHT CSS pixels tall, so the cut points are multiples of it
// once the screenshot's pixel density is taken into account.
//
// Usage: node tools/slice.js <lab-id> <full-page-png> [css-width]
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const CARD_HEIGHT = 620;
const PAGE_WIDTH = 1000;
const [labId, source, widthArg] = process.argv.slice(2);

if (!labId || !source) {
  console.error("usage: node tools/slice.js <lab-id> <full-page-png> [width]");
  process.exit(1);
}

const order = JSON.parse(
  fs.readFileSync(path.join(__dirname, "out", "order.json"), "utf8")
)[labId];

if (!order) {
  console.error(`no capture order recorded for ${labId}`);
  process.exit(1);
}

const buffer = fs.readFileSync(source);
const full = PNG.sync.read(buffer);

const cssWidth = widthArg ? Number(widthArg) : PAGE_WIDTH;
const scale = full.width / cssWidth;
const cardPx = Math.round(CARD_HEIGHT * scale);
const width = full.width;

const cards = Math.floor(full.height / cardPx);
const count = Math.min(cards, order.length);

if (count < order.length) {
  console.warn(
    `only ${cards} complete cards in the screenshot, expected ${order.length}`
  );
}

const targetDir = path.join(__dirname, "..", labId, "screenshots");
fs.mkdirSync(targetDir, { recursive: true });

for (let index = 0; index < count; index += 1) {
  const top = index * cardPx;
  const slice = new PNG({ width, height: cardPx });

  PNG.bitblt(full, slice, 0, top, width, cardPx, 0, 0);

  const file = path.join(targetDir, `${order[index]}.png`);
  fs.writeFileSync(file, PNG.sync.write(slice));
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
