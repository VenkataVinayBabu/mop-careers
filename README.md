# MOP Careers

Learning and placement platform for **MOP Careers**, a Python Full Stack bootcamp
(45-day course + 45-day internship, 55 class days).

Two faces:

- **Public site** — program info and an enquiry form. No login. *(Phase 5)*
- **Platform** — role-based app for admins, teachers and students. Login and
  forgot-password only; **there is no self-registration.**

| | |
|---|---|
| Backend | FastAPI · PostgreSQL · SQLAlchemy 2.0 · Alembic · JWT |
| Frontend | React 18 (Vite) · Tailwind CSS · React Router · Axios |
| AI | Anthropic API *(Phases 3–4)* |
| PDF | reportlab *(Phase 3)* |

---

## Prerequisites

Python 3.11+ · Node 20+ · PostgreSQL 14+ · Git

---

## First-time setup

### 1. Database

Create the role and database (you will be prompted for your `postgres` password):

```bash
psql -U postgres -h localhost -c "CREATE ROLE mop LOGIN PASSWORD 'MopDev@2026';"
```

```bash
psql -U postgres -h localhost -c "CREATE DATABASE mop_careers OWNER mop;"
```

### 2. Backend

```bash
cd backend && python -m venv .venv && .venv/Scripts/python.exe -m pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and fill it in. Note that special
characters in the database password must be URL-encoded (`@` becomes `%40`):

```
DATABASE_URL=postgresql+psycopg2://mop:MopDev%402026@localhost:5432/mop_careers
```

Generate a JWT secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Run the migrations, then seed the demo data:

```bash
cd backend && .venv/Scripts/python.exe -m alembic upgrade head
```

```bash
cd backend && .venv/Scripts/python.exe -m app.seed
```

### 3. Frontend

```bash
cd frontend && npm install
```

Copy `frontend/.env.example` to `frontend/.env` (the default points at
`http://127.0.0.1:8000`).

---

## Running

### The easy way

Double-click **`start.bat`** in the project root.

It checks PostgreSQL, opens the backend and frontend each in their own window,
waits until both respond, then opens http://localhost:5173 in your browser and
prints the demo logins. Re-running it is safe — anything already running is left
alone.

### Manually

Two terminals.

**Backend** — http://127.0.0.1:8000 (interactive API docs at `/docs`):

```bash
cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

**Frontend** — http://localhost:5173:

```bash
cd frontend && npm run dev
```

### Signing in as more than one role at once

The JWT lives in `localStorage`, which is shared across tabs on the same origin,
so one browser window means one session — signing in as a teacher logs the admin
tab out. Use a separate incognito window (or a second Chrome profile) to hold two
roles at the same time.

---

## Demo accounts

Created by `python -m app.seed`.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@mopcareers.com` | `Admin@123` |
| Teacher | `ravi.kumar@mopcareers.com` | `Teacher@123` |
| Student | `aditya.sharma@example.com` | `Student@123` |

Five students are seeded, all with `Student@123`: Aditya Sharma, Bhavana Reddy,
Charan Teja, Divya Nair, Eshwar Prasad.

`eshwar.prasad@example.com` is seeded with the **forced password change** flag set,
so signing in as them demonstrates the first-login flow. The other accounts skip it
so they stay usable for testing.

Re-seed from scratch with `python -m app.seed --reset` (destructive).

---

## What each role can do

**Admin** — everything. Batch CRUD with teacher assignment, teacher/student account
creation, block/unblock, and the full curriculum workspace for any batch.

**Teacher** — *only their assigned batches.* Mark class days complete, set dates,
paste recording links, upload notes PDFs, take attendance, and view their students'
progress. No access to fees, placements, accounts, or other batches.

**Student** — *own data only.* Home dashboard (milestone roadmap, next class,
attendance stats), 55-day curriculum roadmap with recordings and notes, missed
classes, and schedule. Blocked students see *"Please contact MOP administration"* at
login.

---

## Layout

```
backend/
  alembic/            migrations
  app/
    routers/          auth, admin, teacher, student, files
    config.py         .env-backed settings
    curriculum.py     55-day template (days 1-11 fixed)
    database.py       engine + session
    deps.py           auth dependencies and role guards
    mail.py           SMTP helper; logs to console in dev
    models.py         ORM models
    schemas.py        Pydantic request/response models
    security.py       bcrypt hashing + JWT
    seed.py           demo data
  uploads/notes/      uploaded notes PDFs (gitignored)
frontend/
  src/
    api/              axios client + error formatting
    components/       Layout, Logo, ProtectedRoute, Toast, ui primitives
    context/          AuthContext
    pages/            admin/, teacher/, student/, and the auth screens
```

---

## Notes for maintainers

**Secrets.** `.env` is gitignored; only `.env.example` is committed. No key is ever
hardcoded.

**Swapping in a logo.** The wordmark lives in one place —
`frontend/src/components/Logo.jsx`. Drop an image at `src/assets/logo.png`,
uncomment the import, and set `USE_IMAGE_LOGO = true`. Nothing else changes.

**Emails in dev.** With `APP_ENV=dev` (or no `SMTP_HOST`), `app/mail.py` prints
messages to the backend console instead of sending them. Password reset links appear
there.

**bcrypt, not passlib.** `passlib` 1.7.4 (last released 2020) breaks against
`bcrypt` 5.x — it reads `bcrypt.__about__`, which no longer exists, and then fails
hashing. `app/security.py` uses the `bcrypt` package directly rather than pinning a
stale security dependency.

**Notes PDFs are access-checked.** They are served from `GET /files/notes/{day_id}`
rather than as static files, so a student can only download notes for their own
batch. Uploads are validated by magic bytes, capped at 10 MB, and stored under a
server-generated filename.

---

## Roadmap

- **Phase 1 — Foundation + Curriculum** ✅ complete
- **Phase 2** — Fees + placements (admin)
- **Phase 3** — ATS resume builder + AI scoring
- **Phase 4** — AI interviewer
- **Phase 5** — Public site, enquiries, doubt support, certificates, polish

See [CLAUDE.md](CLAUDE.md) for the full specification and progress log.
