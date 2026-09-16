import type { Plugin } from "vite";
import { aliases, escapeHtml, getPage, NO_INDEX, pages, renderSeoHead, SITE_URL } from "../src/lib/seo";

export function seoPlugin(): Plugin {
  const allowIndex = !process.env.CONTEXT || process.env.CONTEXT === "production";
  return {
    name: "static-page-seo",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset") throw new Error("Missing built index.html");
      const template = String(index.source);
      if (!template.includes("<!-- SEO_HEAD -->")) throw new Error("Missing SEO head placeholder");
      const render = (path: string) => {
        const page = getPage(path);
        // Useful public copy and links are available even before the app loads.
        // Live product stock and prices remain in the app and are never frozen at build time.
        const fallback = `<main><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.description)}</p><nav aria-label="Main navigation"><a href="/">Shop</a> · <a href="/about">About us</a> · <a href="/contact">Contact us</a></nav><noscript><p>Enable JavaScript to use online ordering and account features.</p></noscript></main>`;
        return template.replace("<!-- SEO_HEAD -->", renderSeoHead(path, allowIndex))
          .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
      };
      index.source = render("/");
      for (const path of [...Object.keys(pages), ...Object.keys(aliases)]) {
        if (path === "/") continue;
        this.emitFile({ type: "asset", fileName: `${path.slice(1)}.html`, source: render(path) });
      }
      this.emitFile({ type: "asset", fileName: "404.html", source: render("/404") });
      const urls = allowIndex ? Object.entries(pages).filter(([, page]) => page.index).map(([path]) =>
        `  <url><loc>${SITE_URL}${path}</loc></url>`).join("\n") : "";
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source:
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
      // Do not disallow private HTML: crawlers must fetch its noindex directive to remove it.
      this.emitFile({ type: "asset", fileName: "robots.txt", source:
        `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n` });
      const privatePaths = Object.entries(pages).filter(([, page]) => !page.index).map(([path]) => path);
      privatePaths.push("/track-order", "/404.html");
      const headers = allowIndex ? privatePaths.flatMap(path => [path, `${path}/`, `${path}/*`, `${path}.html`]) : ["/*"];
      this.emitFile({ type: "asset", fileName: "_headers", source: headers.map(path =>
        `${path}\n  X-Robots-Tag: ${NO_INDEX}\n`).join("\n") });
    },
  };
}
