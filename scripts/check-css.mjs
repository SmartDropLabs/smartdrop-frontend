/**
 * Pre-build CSS validation (issue #480).
 *
 * `next build` compiles CSS through PostCSS but only fails loudly on some
 * classes of error, and a broken globals.css otherwise surfaces as silently
 * unstyled pages. Parsing every stylesheet with PostCSS up front makes any
 * syntax error fail the build with a file/line/column diagnostic.
 *
 * Usage:
 *   node scripts/check-css.mjs        (also wired into `pnpm build`)
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postcss from "postcss";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_ROOTS = ["src"];

async function collectCssFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      files.push(...(await collectCssFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Parses every CSS file under the known roots.
 * @returns {Promise<{ files: string[], errors: { file: string, line?: number, column?: number, message: string }[] }>}
 */
export async function validateCssFiles() {
  const files = [];
  for (const root of CSS_ROOTS) {
    files.push(...(await collectCssFiles(path.join(ROOT, root))));
  }
  files.sort();

  const errors = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    try {
      await postcss.parse(source, { from: file });
    } catch (error) {
      errors.push({
        file: path.relative(ROOT, file),
        line: error.line,
        column: error.column,
        message: error.reason ?? String(error.message ?? error),
      });
    }
  }

  return { files, errors };
}

async function main() {
  const { files, errors } = await validateCssFiles();

  if (errors.length > 0) {
    for (const error of errors) {
      const location = error.line ? `:${error.line}:${error.column ?? 0}` : "";
      console.error(`[css] ERROR ${error.file}${location} - ${error.message}`);
    }
    console.error(
      `[css] Validation failed: ${errors.length} of ${files.length} stylesheet(s) could not be parsed.`
    );
    process.exit(1);
  }

  console.log(`[css] Validation passed: ${files.length} stylesheet(s) parsed.`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[css] Validation could not run: ${error?.message ?? error}`);
    process.exit(1);
  });
}
