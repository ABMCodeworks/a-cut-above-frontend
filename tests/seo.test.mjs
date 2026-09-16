import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { test } from "node:test";
import { resolve } from "node:path";

const dist = resolve(process.env.SEO_DIST_DIR || "dist");
const preview = process.env.SEO_EXPECT_NOINDEX === "1";
const read = (file) => readFile(resolve(dist, file), "utf8");
const origin = "https://acutabovemeats.co.zw";
const publicPages = ["", "about", "contact", "privacy", "cookie-policy", "terms"];
const privatePages = ["admin", "admin/setup", "admin/register", "admin/dashboard", "checkout", "track", "track-order", "wholesale", "privacy-rights", "404"];

test("public pages have unique static metadata, canonical URLs and readable content", async () => {
  const titles = new Set();
  for (const path of publicPages) {
    const html = await read(path ? `${path}.html` : "index.html");
    assert.equal((html.match(/<title\b/g) || []).length, 1);
    titles.add(html.match(/<title[^>]*>(.*?)<\/title>/)[1]);
    assert.ok(html.includes(`rel="canonical" href="${origin}/${path}"`));
    assert.match(html, /name="description" content="[^"]{50,}"/);
    assert.match(html, /<h1>[^<]+<\/h1>/);
    assert.match(html, /href="\/contact"/);
    assert.doesNotMatch(html, /href="\/admin/);
    assert.doesNotMatch(html, /SEO_HEAD/);
    assert.match(html, preview ? /name="robots" content="noindex/ : /name="robots" content="index, follow/);
  }
  assert.equal(titles.size, publicPages.length);
});

test("private and error pages ship noindex without waiting for JavaScript", async () => {
  for (const path of privatePages) {
    const html = await read(`${path}.html`);
    assert.match(html, /name="robots" content="noindex, nofollow, noarchive"/);
    assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json|property="og:/);
  }
});

test("sitemap lists only canonical public pages and robots allows noindex discovery", async () => {
  const sitemap = await read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, preview ? [] : publicPages.map(path => `${origin}/${path}`));
  const robots = await read("robots.txt");
  assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.doesNotMatch(robots, /Disallow: \/admin/);
});

test("private routes and their HTML variants have HTTP noindex headers", async () => {
  const headers = await read("_headers");
  if (preview) {
    assert.match(headers, /^\/\*\n  X-Robots-Tag: noindex/);
    return;
  }
  for (const path of privatePages.filter(path => path !== "404")) {
    for (const suffix of ["", "/", "/*", ".html"]) {
      assert.ok(headers.includes(`/${path}${suffix}\n  X-Robots-Tag: noindex`), `Missing header for /${path}${suffix}`);
    }
  }
});

test("social metadata points to real assets and structured data uses the production domain", async () => {
  await access(resolve(dist, "brand-logo.png"));
  for (const path of publicPages) {
    const html = await read(path ? `${path}.html` : "index.html");
    if (preview) {
      assert.doesNotMatch(html, /application\/ld\+json/);
      continue;
    }
    assert.ok(html.includes(`property="og:image" content="${origin}/brand-logo.png"`));
    const json = JSON.parse(html.match(/<script data-seo type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(json["@context"], "https://schema.org");
    assert.ok(json["@graph"].some(item => item["@type"] === "Organization"));
    assert.ok(json["@graph"].some(item => item["@type"] === "WebSite"));
    assert.doesNotMatch(JSON.stringify(json), /netlify\.app|localhost|aggregateRating/);
  }
});

test("duplicate shop pages canonicalize to home and unknown routes return 404", async () => {
  for (const path of ["shop", "products"]) {
    assert.ok((await read(`${path}.html`)).includes(`rel="canonical" href="${origin}/"`));
  }
  const config = await readFile("netlify.toml", "utf8");
  assert.match(config, /from = "\/\*"\s+to = "\/404.html"\s+status = 404/);
  assert.ok(config.indexOf("acutabovetest.netlify.app") < config.indexOf('from = "/api/*"'));
});
