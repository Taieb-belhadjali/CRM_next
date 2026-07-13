# CRM Frontend

React SPA (Vite, not Next.js). Talks to `../backend`'s REST API over `fetch`.

## Stack

- React + Vite
- React Router
- Tailwind CSS
- JWT stored client-side, sent as `Authorization: Bearer <token>` on protected calls

## Setup

```bash
cp .env.example .env.local   # VITE_API_URL=http://localhost:4000
npm install
npm run dev   # runs on http://localhost:5173
```

## Structure

```
src/
├── lib/api.js              # fetch wrapper for the backend API
├── context/AuthContext.jsx # holds JWT + current user, login()/logout()
├── components/ProtectedRoute.jsx
└── pages/
    ├── Login.jsx
    └── Dashboard.jsx
```
