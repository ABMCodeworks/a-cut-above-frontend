# A Cut Above Frontend (React + TypeScript + Ant Design)

## Setup
1. Copy env:
   - `cp .env.example .env`
2. Install deps:
   - `npm install`
3. Start:
   - `npm run dev`

Frontend runs on `http://localhost:5173`.

## Netlify module compatibility
The package uses `"type": "commonjs"` so the Netlify Email Integration's generated
`emails/index.js` function can load correctly. Keep the Vite configuration named
`vite.config.mts` so it uses ES modules independently of the package setting.
Vite still bundles the React application as ES modules, and Node scripts that need
ES modules use the `.mjs` extension.

## Wholesale PIN
Click the **Wholesale** button in the top bar and enter the PIN. The PIN is stored locally and sent as `x-wholesale-pin` on API requests.

## Search visibility
`src/lib/seo.ts` is the source for page titles, descriptions, canonical URLs,
Open Graph/Twitter sharing tags and Organization/WebSite/page structured data.
Only verified business information belongs here; do not add invented ratings,
product availability, addresses or opening hours.

The Vite SEO plugin generates public and private route HTML, `sitemap.xml`,
`robots.txt`, a 404 page, and `_headers` into `dist` on every build. Metadata and
brief public page introductions are present before JavaScript loads. The catalog
still loads live products through the API; these are not static product pages.
Add new routes to the SEO configuration as well as `App.tsx`, otherwise direct
requests will correctly return 404. Public route files use Netlify's clean URLs.

Admin, wholesale sign-in, checkout, tracking and privacy-request pages are excluded
from the sitemap and marked `noindex` in HTML and HTTP headers. They are deliberately
not blocked in robots.txt: search engines must be able to fetch the noindex directive.
Admin access still requires the existing server-side authentication; noindex is not
access control. Admin screens load separately, and the dashboard renders only after
the authentication check succeeds. Backend admin responses use `Cache-Control: no-store`.

Netlify deploy previews and branch deploys get site-wide noindex headers and an empty
sitemap. Production canonicals use `https://acutabovemeats.co.zw`; `/shop` and
`/products` redirect to `/`. No analytics or tracking cookies are added.

Run `npm run test:seo` to build and verify the generated search files. After deploying
both repositories, check HTTP headers on `/admin` and `/admin/dashboard`, confirm
that an unknown URL returns 404, and submit
`https://acutabovemeats.co.zw/sitemap.xml` in the verified Google Search Console
property. Existing search listings disappear after recrawling; use Search Console's
removal tool for urgent removal. DNS and valid HTTPS must be working first.
