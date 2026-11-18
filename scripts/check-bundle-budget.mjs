import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const budgets = {
  javascriptGzipBytes: 760 * 1024,
  cssGzipBytes: 20 * 1024,
  totalGzipBytes: 780 * 1024,
};

const roots = [join(".next", "static")];
const totals = { js: 0, css: 0 };

function walk(dir) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(path);
      continue;
    }

    if (!entry.isFile() || !/\.(js|css)$/.test(entry.name)) {
      continue;
    }

    const bytes = gzipSync(readFileSync(path)).byteLength;
    if (entry.name.endsWith(".js")) {
      totals.js += bytes;
    } else {
      totals.css += bytes;
    }
  }
}

for (const root of roots) {
  walk(root);
}

const total = totals.js + totals.css;
const failures = [
  ["JavaScript gzip", totals.js, budgets.javascriptGzipBytes],
  ["CSS gzip", totals.css, budgets.cssGzipBytes],
  ["Total gzip", total, budgets.totalGzipBytes],
].filter(([, actual, budget]) => actual > budget);

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

console.log(`JavaScript gzip: ${format(totals.js)} / ${format(budgets.javascriptGzipBytes)}`);
console.log(`CSS gzip: ${format(totals.css)} / ${format(budgets.cssGzipBytes)}`);
console.log(`Total gzip: ${format(total)} / ${format(budgets.totalGzipBytes)}`);

if (failures.length > 0) {
  for (const [label, actual, budget] of failures) {
    console.error(`${label} budget exceeded: ${format(actual)} > ${format(budget)}`);
  }
  process.exit(1);
}
