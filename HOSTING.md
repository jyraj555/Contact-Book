# Render hosting

This configuration implements hosting for the existing learning app. It is not
yet hardened for storing private contacts publicly: there is no authentication,
and the pinned Node 16/Angular 15 stack is out of support. Upgrade the stack and
add access control before using real personal data on a public service.

## Deploy

1. Push these changes to GitHub. In Render, create a Blueprint from this repository
   using `render.yaml`, or create a Node Web Service with the settings below.
2. Leave Root Directory empty (the repository root).
3. Set `MONGODB_URI` in Render's secret environment settings to your hosted
   MongoDB connection string. Do not commit credentials. Local `127.0.0.1` refers
   to Render's machine there, not your Windows computer.
4. Set `MONGODB_DB=contact_book_production` for separation from your local database.
   Provision a database user and permit Render's outbound addresses through your
   database provider's network access settings.
5. Deploy and check `/api/health`, `/`, `/add`, and `/contacts`.

| Setting | Value |
| --- | --- |
| Build Command | `npm ci --prefix frontend --include=dev && npm run build && npm ci --prefix backend --omit=dev` |
| Start Command | `npm start` |
| NODE_ENV | `production` |
| NODE_VERSION | `16.20.2` (compatibility pin for current Angular 15; upgrade before sensitive use) |
| Health Check | `/api/health` |

Render supplies `PORT`; Express listens on `0.0.0.0` in production. Angular's
build generates HTML, CSS and JavaScript in `frontend/dist/name-register`.
Express serves that folder and the API from the same origin; no development
proxy or CORS configuration is needed. Page routes return Angular's index on
refresh. Missing assets/API paths return 404. If you add another Angular route,
add it to Express's page-route list in `backend/src/app.js` too.

Production startup fails clearly if `MONGODB_URI` or the Angular build is missing.
No production database is bundled or copied from your local installation.
Render's HTTPS endpoint terminates TLS; the internal Express listener uses HTTP.

## Local development stays separate

Keep `NODE_ENV` unset. Run `npm start` in `backend` and `frontend` in separate
terminals as before. Angular remains at port 4200, Express at port 3000, using
local MongoDB and `name_register_learning`. Do not set production variables
globally on your machine. `.env.example` is documentation, not an auto-loaded file.

## Local production preview (PowerShell)

From the repository root, with dependencies installed:

```powershell
npm run build
npm run test:hosting
$env:NODE_ENV = 'production'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017'
$env:MONGODB_DB = 'contact_book_preview'
$env:PORT = '3100'
npm start
```

Open `http://127.0.0.1:3100/` and directly refresh `/add` and `/contacts`.
These variables affect only this terminal. Stop the preview with Ctrl+C and
close the terminal afterward. Use a new terminal for regular development.

`npm test` verifies actual database CRUD in a unique temporary test database.
`npm run test:hosting` verifies built assets, navigation refresh responses,
cache headers, missing routes, and environment separation without changing data.

References: https://render.com/docs/web-services and
https://render.com/docs/node-version.
