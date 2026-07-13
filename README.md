# PulseCRM

A full-stack CRM application built with Next.js (API backend) and React + Vite (frontend).

## Architecture

```
crm-app/
├── backend/    Next.js 16 — API routes only (no frontend pages)
└── frontend/   React 19 + Vite + Tailwind CSS 4
```

| Layer    | Tech                                      |
| -------- | ----------------------------------------- |
| Frontend | React 19, Vite, React Router 7, Tailwind 4 |
| Backend  | Next.js 16 App Router (API routes only)   |
| Database | MongoDB via Mongoose                      |
| Auth     | JWT (jsonwebtoken) + bcrypt               |

---

## Getting started

### Prerequisites

- Node.js 20+
- A MongoDB connection string (Atlas or local)

### 1. Backend

```bash
cd backend
cp .env.example .env.local   # fill in MONGODB_URI, JWT_SECRET, FRONTEND_URL
npm install
npm run dev                  # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env         # set VITE_API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:5173
```

---

## Environment variables

### Backend — `.env.local`

| Variable       | Description                                   |
| -------------- | --------------------------------------------- |
| `MONGODB_URI`  | MongoDB connection string                     |
| `JWT_SECRET`   | Secret used to sign/verify JWT tokens         |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:5173`) |

### Frontend — `.env`

| Variable       | Description                     |
| -------------- | ------------------------------- |
| `VITE_API_URL` | Backend base URL (no trailing slash) |

---

## API routes

### Auth

| Method | Path                    | Auth     | Description            |
| ------ | ----------------------- | -------- | ---------------------- |
| POST   | `/api/auth/register`    | Public   | Create account         |
| POST   | `/api/auth/login`       | Public   | Login, returns JWT     |
| GET    | `/api/auth/me`          | Bearer   | Get current user       |

### Admin — Users

| Method | Path                        | Auth        | Description             |
| ------ | --------------------------- | ----------- | ----------------------- |
| GET    | `/api/admin/users`          | Admin only  | List all users          |
| POST   | `/api/admin/users`          | Admin only  | Create/invite user      |
| PATCH  | `/api/admin/users/:id`      | Admin only  | Edit name, email, role, isActive |
| DELETE | `/api/admin/users/:id`      | Admin only  | Delete user             |

---

## Data models

### User
```
name, email, passwordHash, role (admin|commercial), isActive, timestamps
```

### Contact
```
firstName, lastName, email, phone, accountId (ref Account), ownerId (ref User), timestamps
```

### Account
```
name, industry, website, ownerId (ref User), timestamps
```

### Prospect
```
name, email, phone, source, status, ownerId (ref User), timestamps
```

### Deal
```
title, value, stage, contactId (ref Contact), accountId (ref Account), ownerId (ref User), timestamps
```

### Task
```
title, dueDate, priority, done, relatedTo (polymorphic ref), ownerId (ref User), timestamps
```

---

## Roles

| Role         | Access                                         |
| ------------ | ---------------------------------------------- |
| `admin`      | Full access + user management (`/admin/users`) |
| `commercial` | CRM features only, no admin panel              |

---

## Scripts

### Backend
```bash
npm run dev           # Start dev server on port 4000
npm run build         # Production build
npm run start         # Start production server
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting (CI)
```

### Frontend
```bash
npm run dev     # Start Vite dev server on port 5173
npm run build   # Production build
npm run preview # Preview production build
npm run lint    # Run oxlint
```
