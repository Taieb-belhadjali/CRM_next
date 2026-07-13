# Sprint Plan — CRM Project (2-Month Internship, Solo Developer)

**Stack:** React (front) · Next.js (back/API routes) · MongoDB (database)
**Duration:** 8 weeks · 4 sprints × 2 weeks · 1 developer
**Approach:** MVP-first. Full backlog has 17 modules — impossible to build all with quality solo in 8 weeks, so scope is cut to the core CRM loop (Prospect → Contact → Account → Deal → Task), with everything else explicitly deferred (see bottom section).

---

## Sprint 0 (part of Week 1) — Kickoff & Architecture
*Not a full sprint, but budget 2-3 days before Sprint 1 starts*

- Validate scope with supervisor/client using this plan
- Design MongoDB schema: `User`, `Contact`, `Account`, `Prospect`, `Deal`, `Task` (with relations via ObjectId refs)
- Next.js project setup (App Router), folder structure, ESLint/Prettier
- MongoDB connection (Mongoose or native driver) + `.env` config
- Git repo + basic README

---

## Sprint 1 (Weeks 1-2) — Foundation & Auth

**Goal:** A user can log in and see a role-appropriate shell.

- **Auth & Security**
  - Registration/login with hashed passwords (bcrypt), JWT or NextAuth session
  - Roles: `admin`, `commercial` (skip OTP/2FA — stretch goal if time remains)
  - Basic session handling, protected API routes/middleware
- **Layout shell**
  - Sidebar navigation, header, role-based route guarding
  - Responsive base layout (mobile-friendly, not full mobile app)
- **User management (admin)**
  - Create/list/edit users, assign roles

**Deliverable:** working login + dashboard shell + user CRUD.

---

## Sprint 2 (Weeks 3-4) — Core Entities: Contacts, Accounts, Prospects

**Goal:** The three foundational CRM entities exist and are linked.

- **Contacts module**: CRUD, detail page (name, company, phone, email), list view
- **Accounts module**: CRUD, detail page (name, sector, size, status), linked contacts shown on account page
- **Prospects module**:
  - CRUD, detail page with tags (VIP, converted, unqualified, etc.)
  - List view with filters (status, tag, owner)
  - **CSV/Excel import-export** (papaparse or SheetJS/xlsx — bulk add/extract prospects)
  - **Map view** (Leaflet + OpenStreetMap, free/no API key) — plot prospects by address, click pin → mini profile
  - *Defer: web form capture*
- Relations wired: prospect → can convert to contact/account (simple status flag is enough, not a full workflow engine)

**Deliverable:** the three core entity modules, cross-linked, list + detail views, plus import/export and map view for prospects.

---

## Sprint 3 (Weeks 5-6) — Sales Pipeline: Deals, Tasks, Calendar (basic)

**Goal:** Sales activity can be tracked end to end.

- **Deals/Opportunities module**
  - Configurable pipeline stages (hardcode a sensible default set: prospection, proposition, négociation, gagné/perdu)
  - Kanban view with drag-and-drop between stages (this is usually the "wow" demo feature — prioritize it)
  - Table view with filters
  - Linked to contact/account
- **Tasks module**
  - CRUD, priority (low/med/high), due date, assignee, status (todo/in progress/done)
  - Linked to prospect/contact/account/deal
- **Calendar (simplified)**
  - Basic weekly view listing tasks/deals with due dates
  - *Defer: Google Calendar/Outlook sync*
- **Calls module (basic)**
  - CRUD log of calls (emitted/received/missed), scheduled call with reminder, post-call note
  - Linked to contact/prospect/deal
- **Meetings module (basic)**
  - CRUD, object/date/time/location, internal + external participants
  - *Defer: auto-generated Zoom/Meet/Teams links — just a manual "meeting link" text field for now*
- **Support Tickets module (basic)**
  - CRUD, status (open/in progress/closed), priority, linked to contact/account
  - *Defer: dedicated Support role/portal — tickets are manageable by admin/commercial for now*

**Deliverable:** working Kanban pipeline + task tracking + simple calendar view + calls/meetings logs + basic ticketing.

---

## Sprint 4 (Weeks 7-8) — Dashboard, Polish, Testing, Demo Prep

**Goal:** Ship something presentable and defensible.

- **Dashboard**: role-based KPIs (open deals, tasks due today, prospects this week), 1-2 charts (e.g. pipeline by stage)
- **Global search**: single search bar across contacts/accounts/prospects/deals/tickets, multicriteria filters
  - **Saved searches**: persist a filter object per user, reload from a dropdown
- Bug fixing, UI consistency pass, empty/error states
- Basic automated tests for critical paths (auth, deal stage update) if time allows
- Deployment (Vercel + MongoDB Atlas free tier is the easiest path)
- Internship report writing + demo script/slides

**Deliverable:** deployed, demoable CRM covering the full prospect-to-deal-to-task loop.

---

## Explicitly Deferred (out of scope for the 2-month MVP)

Flag these to your supervisor now so expectations are aligned — frame them as a "Phase 2 roadmap":

- **Quotes → Invoices → Orders → Delivery chain**: sequential, each has real business logic (tax calc, PDF generation, status cascades) — too much to half-build
- **External User portal**: needs its own auth/permission layer, essentially a second app
- **Custom fields / configurable workflows / document templates (Settings)**: meta-feature (a system that builds forms), disproportionate effort
- **Calendar sync (Google/Outlook)**: OAuth setup + API quirks eat days for a "nice to have"
- **Video conferencing auto-generation** (Zoom/Meet/Teams links) — manual link field is the MVP substitute
- **OTP/2FA**, password policies, session/login journaling
- **Web form capture** for prospects (public-facing lead form)
- **Business card scan**
- **Dedicated Support role/portal** (tickets exist, but full support workflow doesn't)

## Risk Notes

- **Kanban drag-and-drop**, **auth**, and **map view (Leaflet)** are the technically riskiest pieces — tackle early in their sprint, not at the end.
- Sprint 3 is now the most loaded (Deals + Tasks + Calendar + Calls + Meetings + Tickets). If it starts slipping, cut in this order: Meetings → Calls → Tickets. Deals/Kanban and Tasks are non-negotiable — they're the heart of the demo.
- If Sprint 1 runs long (auth is a common time sink), cut 2FA/OTP first — it wasn't fully in scope anyway.
- If Sprint 2 runs long, cut map view before CSV import/export — import/export is more broadly useful for a demo/data seeding than the map.
- Keep a running "Phase 2 backlog" doc from the full original backlog — useful deliverable to hand over even if you don't build it.
