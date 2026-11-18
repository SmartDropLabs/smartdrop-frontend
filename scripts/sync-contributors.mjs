#!/usr/bin/env node

/**
 * Fetches contributor data from the GitHub API for all SmartDropLabs repos
 * and writes it to src/data/contributors.json.
 *
 * Usage:
 *   node scripts/sync-contributors.mjs
 *
 * Requires GITHUB_TOKEN env var for higher rate limits (optional but recommended).
 */

import { writeFileSync } from "fs";
import { join } from "path";

const ORG = "SmartDropLabs";
const REPOS = ["smartdrop-frontend", "smartdrop-backend", "smartdrop-contracts"];
const OUTPUT = join(import.meta.dirname, "..", "src", "data", "contributors.json");

const headers = process.env.GITHUB_TOKEN
  ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  : {};

async function fetchContributors(repo) {
  const url = `https://api.github.com/repos/${ORG}/${repo}/contributors?per_page=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`  ⚠ Failed to fetch ${repo}: ${res.status}`);
    return [];
  }
  return res.json();
}

async function main() {
  console.log(`Syncing contributors for ${ORG}...`);

  const contributorsMap = new Map();

  for (const repo of REPOS) {
    console.log(`  Fetching ${repo}...`);
    const contributors = await fetchContributors(repo);
    for (const c of contributors) {
      if (c.type !== "User") continue; // skip bots
      const existing = contributorsMap.get(c.login);
      if (existing) {
        existing.contributions += c.contributions;
      } else {
        contributorsMap.set(c.login, {
          login: c.login,
          avatar_url: c.avatar_url,
          html_url: c.html_url,
          contributions: c.contributions,
        });
      }
    }
  }

  const data = {
    fetchedAt: new Date().toISOString(),
    contributors: [...contributorsMap.values()],
  };

  writeFileSync(OUTPUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`Wrote ${data.contributors.length} contributors to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
