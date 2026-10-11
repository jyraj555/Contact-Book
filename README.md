# Contact-Book

For the production build, Render configuration, MongoDB secrets and separate local
development instructions, see [HOSTING.md](HOSTING.md).

A learning project for the MEAN stack: MongoDB, Express, Angular and Node.js.

## Features

- Home page with live contact count.
- Add contacts using first name, last name, company, two mobile numbers and email.
- Search, edit and delete contacts on a separate page.
- Confirmation before deletion and validation before saving.
- Local MongoDB persistence, including after refreshing the browser.

First name and mobile number 1 are required. Other fields are optional.

## Requirements

The project was tested with Node.js 16.17.1, npm 8.15.0 and MongoDB Server 6.0.2.
It uses Angular 15.2, Express 4.21.2 and the MongoDB Node driver 5.9.2.
These versions match the original learning environment; Node 16 and Angular 15
are out of support. Upgrade the stack before considering production deployment.
The API has no authentication and binds to the local computer only.

## Run locally

Start your local MongoDB server, then open two terminals at the repository root.

Backend:

```sh
cd backend
npm ci
npm start
```

Frontend, in the second terminal:

```sh
cd frontend
npm ci
npm start
```

Open **http://127.0.0.1:4200/**. Do not open Angular template files directly or
with Live Server. Angular's development server compiles the templates and proxies
API requests to Express on port 3000. Stop each server with Ctrl+C.

| Page | Path |
| --- | --- |
| Home | / |
| Add Contact | /add |
| View Contacts | /contacts |

## Database

Connect Compass to `mongodb://127.0.0.1:27017`. Records are stored in database
`name_register_learning`, collection `names`. The collection keeps its original
name to preserve the earlier name-register exercise's data. Old name-only records
remain readable; editing them requires supplying a primary mobile number.

MongoDB stores data in the folder configured by its `storage.dbPath` setting,
not in this repository. Database contents and personal contacts are not included.

The backend reads these optional environment variables:

| Variable | Default |
| --- | --- |
| MONGODB_URI | mongodb://127.0.0.1:27017 |
| MONGODB_DB | name_register_learning |
| PORT | 3000 |

Set variables in your shell before starting the backend. The app does not load
.env files. If the API port changes, update `frontend/proxy.conf.json` too.

## How it works

The Angular form calls `ContactsService`, which sends JSON through the development
proxy to Express. Express validates the fields and reads or writes MongoDB.
The view page retrieves saved contacts on entry. Updates and deletions use each
record's MongoDB ID.

| File | Responsibility |
| --- | --- |
| backend/src/server.js | MongoDB connection and HTTP server startup |
| backend/src/app.js | API routes, validation and error responses |
| backend/test/integration.js | Real HTTP and MongoDB integration tests |
| frontend/src/main.ts | Angular startup and page routes |
| frontend/src/app/app.component.* | Shared navigation and page shell |
| frontend/src/app/home.component.ts | Home cards and contact count |
| frontend/src/app/add-contact.component.* | Add form and submission feedback |
| frontend/src/app/view-contacts.component.* | Search, editing and deletion |
| frontend/src/app/contacts.service.ts | Typed HTTP requests |
| frontend/src/styles.css | Responsive dark layout |
| frontend/proxy.conf.json | Development API proxy |

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/health | Check MongoDB connectivity |
| GET | /api/contacts | List contacts |
| POST | /api/contacts | Create a contact |
| PUT | /api/contacts/:id | Update a contact |
| DELETE | /api/contacts/:id | Delete a contact |

POST and PUT accept `firstName`, `lastName`, `company`, `mobile1`, `mobile2`
and `email` as strings. Phone numbers retain leading zeros and optional formatting.
Validation checks phone/email format, not ownership. Legacy GET/POST `/api/names`
endpoints are retained for the earlier exercise.

## Verify

With MongoDB running:

```sh
cd backend
npm test
```

Tests create a uniquely named temporary database, verify persistence, validation,
updates and deletions, and remove only their own temporary database.

Build Angular:

```sh
cd frontend
npm run build
```

Manual check: add a disposable contact, find it on View Contacts, edit it, refresh,
then try Cancel and Confirm delete. Build and database integration checks passed
during development; automated visual browser testing was unavailable.

Production hosting uses Express to serve the Angular build and API together.
The development proxy remains exclusive to the local Angular development server.
