# CRM — Internship Project

Two separate apps, talking over HTTP:

```
crm-app/
├── backend/     # Next.js — API-only, no pages. MongoDB via Mongoose. JWT auth.
└── frontend/    # React (Vite) — SPA that consumes the backend's REST API.
```

## Why split like this

- **backend/** exposes a REST API under `/api/*`. No pages, no SSR — it's purely
  the data + auth layer.
- **frontend/** is a standalone React SPA (Vite, not Next.js) that runs on its
  own dev server and calls the backend over `fetch`.
- Since the two run on different origins, auth is **JWT-based**, not
  cookie-session based: the backend issues a token on login, the frontend
  stores it (currently `localStorage` — fine for the internship MVP, worth
  revisiting for production hardening) and sends it as `Authorization: Bearer <token>`.
- CORS is handled explicitly in `backend/lib/cors.js` — the allowed origin
  must match `frontend`'s URL exactly (`FRONTEND_URL` env var).

## Running locally

You need **two terminals** — both apps must run at the same time.

### 1. Backend (port 4000)

```bash
cd backend
cp .env.example .env.local   # fill in MONGODB_URI, generate JWT_SECRET
npm install
npm run dev
```

### 2. Frontend (port 5173)

```bash
cd frontend
cp .env.example .env.local   # VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Testing the auth flow

Since there's no signup UI yet, register a user directly against the API:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"changeme","role":"admin"}'
```

Then log in through the frontend at `/login` with those credentials.

## Data model

See `backend/models/` — `User`, `Account`, `Contact`, `Prospect`, `Deal`, `Task`.
Full schema notes in `backend/README.md`.

## Sprint plan

See `SPRINT_PLAN.md` for the full roadmap and what's explicitly out of scope.
