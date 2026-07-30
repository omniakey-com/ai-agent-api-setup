import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE = resolve("site");

test("every DOM id referenced by the app exists in the HTML", async () => {
  const [html, app] = await Promise.all([
    readFile(resolve(SITE, "index.html"), "utf8"),
    readFile(resolve(SITE, "app.mjs"), "utf8"),
  ]);
  const ids = [...app.matchAll(/querySelector\("#([a-z0-9-]+)"\)/g)].map((match) => match[1]);
  assert.ok(ids.length > 10);
  for (const id of ids) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `Missing #${id}`);
  }
});

test("the web app has no external runtime dependency or secret field", async () => {
  const [html, app] = await Promise.all([
    readFile(resolve(SITE, "index.html"), "utf8"),
    readFile(resolve(SITE, "app.mjs"), "utf8"),
  ]);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /type=["']password["']/i);
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB/);
});

test("required local visual and discovery assets exist", async () => {
  await Promise.all(
    [
      "assets/omniakey-mark.svg",
      "assets/lucide.svg",
      "assets/og.png",
      "robots.txt",
      "sitemap.xml",
    ].map((path) => access(resolve(SITE, path))),
  );
});

test("responsive layout includes tablet and mobile breakpoints", async () => {
  const css = await readFile(resolve(SITE, "styles.css"), "utf8");
  assert.match(css, /@media \(max-width: 920px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.doesNotMatch(css, /font-size:\s*[^;]*(vw|cqw)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/);
});
