# CRM Backend

Next.js, **API-only** (no pages/UI). Provides the REST API consumed by `../frontend`.

## Stack

- Next.js (App Router, `app/api/*` routes only)
- MongoDB + Mongoose
- JWT auth (`jsonwebtoken` + `bcryptjs`) — not NextAuth, since the frontend
  is a separate-origin SPA and cookie-session auth doesn't fit that split cleanly

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev   # runs on http://localhost:4000
```

## Endpoints (Sprint 0/1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | Health check |
| POST | `/api/auth/register` | none | Create a user |
| POST | `/api/auth/login` | none | Returns `{ token, user }` |
| GET | `/api/auth/me` | Bearer token | Returns the current user |

## Data model

| Model | Purpose | Key relations |
|---|---|---|
| `User` | Auth + roles (admin, commercial) | — |
| `Account` | Companies/clients | owner → User |
| `Contact` | People tied to an Account | account → Account, owner → User |
| `Prospect` | Leads, pre-conversion | owner → User; geo-indexed for map view |
| `Deal` | Sales pipeline opportunities | account → Account, contacts → Contact[], owner → User |
| `Task` | Action items, polymorphic link | assignee → User, relatedTo → any of the above |
