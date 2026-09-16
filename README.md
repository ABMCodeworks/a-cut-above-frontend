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
