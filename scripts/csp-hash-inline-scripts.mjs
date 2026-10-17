/**
 * Post-build CSP hashing for the static export.
 *
 * The GitHub Pages build (NEXT_EXPORT=true) has no middleware, so it can't
 * issue per-request nonces; its CSP is a <meta> tag rendered by
 * src/app/layout.tsx with `script-src 'self'`. That blocks every inline
 * <script> Next.js emits (RSC payload, bootstrap, Chakra's ColorModeScript),
 * and the only safe way to allow them is by hash. This script walks every
 * exported HTML page, hashes each inline script exactly as it appears in the
 * file, and adds those `'sha256-…'` sources to that page's meta CSP.
 *
 * Usage:
 *   node scripts/csp-hash-inline-scripts.mjs [outDir]   (wired into `npm run build`)
 *
 * No-op unless NEXT_EXPORT=true (server mode uses nonces from the middleware).
 */

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const CSP_META_RE = /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i;
const CONTENT_ATTR_RE = /\bcontent=(["'])([\s\S]*?)\1/i;

function decodeAttr(value) {
  return value
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Base64 sha256 digests of every inline (non-src) script in `html`. */
export function collectInlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(SCRIPT_RE)) {
    if (/\bsrc\s*=/i.test(attrs) || body.length === 0) continue;
    hashes.add(createHash("sha256").update(body, "utf8").digest("base64"));
  }
  return [...hashes];
}

/** Appends `'sha256-…'` sources to the script-src directive of `policy`. */
export function addScriptHashes(policy, hashes) {
  if (hashes.length === 0) return policy;
  const sources = hashes.map((hash) => `'sha256-${hash}'`);
  const directives = policy.split(";").map((d) => d.trim()).filter(Boolean);
  const index = directives.findIndex((d) => /^script-src\s/i.test(d) || d === "script-src");
  if (index === -1) {
    directives.push(["script-src 'self'", ...sources].join(" "));
  } else {
    const existing = new Set(directives[index].split(/\s+/));
    directives[index] = [directives[index], ...sources.filter((s) => !existing.has(s))].join(" ");
  }
  return directives.join("; ");
}

/**
 * Returns `html` with its meta CSP extended by the hashes of its inline
 * scripts, or null if the page has no meta CSP.
 */
export function hashInlineScriptsInHtml(html) {
  const meta = html.match(CSP_META_RE);
  if (!meta) return null;
  const content = meta[0].match(CONTENT_ATTR_RE);
  if (!content) return null;

  const policy = addScriptHashes(decodeAttr(content[2]), collectInlineScriptHashes(html));
  const newMeta = meta[0].replace(CONTENT_ATTR_RE, `content="${encodeAttr(policy)}"`);
  return html.replace(meta[0], () => newMeta);
}

async function collectHtmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtmlFiles(fullPath)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

async function main() {
  if (process.env.NEXT_EXPORT !== "true") return;

  const outDir = path.resolve(ROOT, process.argv[2] ?? "out");
  let files;
  try {
    files = await collectHtmlFiles(outDir);
  } catch {
    console.error(`csp-hash-inline-scripts: export directory not found: ${outDir}`);
    process.exit(1);
  }

  const missing = [];
  for (const file of files) {
    const html = await readFile(file, "utf8");
    const updated = hashInlineScriptsInHtml(html);
    if (updated === null) {
      // Hand-written public/ pages (e.g. offline.html) carry no meta CSP; that
      // only matters if they also have inline scripts it should cover.
      if (collectInlineScriptHashes(html).length > 0) missing.push(path.relative(ROOT, file));
      continue;
    }
    if (updated !== html) await writeFile(file, updated);
  }

  if (missing.length > 0) {
    console.error(
      `csp-hash-inline-scripts: inline scripts but no <meta> Content-Security-Policy in:\n  ${missing.join("\n  ")}`
    );
    process.exit(1);
  }
  console.log(`csp-hash-inline-scripts: hashed inline scripts in ${files.length} page(s)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
