# MOP Careers — Project Spec & Working Agreement

Web platform for **MOP Careers**, a Python Full Stack bootcamp. Two faces: a public
marketing site (no auth) and an authenticated platform (admin / teacher / student).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | FastAPI, PostgreSQL, SQLAlchemy 2.0, Alembic |
| Auth | JWT via python-jose; password hashing via passlib/bcrypt |
| Frontend | React 18 (Vite), Tailwind CSS, React Router, Axios |
| AI | Anthropic API — model from `ANTHROPIC_MODEL` (default `claude-sonnet-4-6`), key from `ANTHROPIC_API_KEY` |
| Email | SMTP from `.env`; dev mode logs to console instead of sending |
| PDF | reportlab (ATS resumes, certificates) |
| Layout | Monorepo: `/backend`, `/frontend`, root `README.md` |

**Never hardcode secrets.** All config via `.env`; `.env.example` is committed, `.env` is gitignored.

Env keys: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ENQUIRY_EMAIL`, `ADMIN_DOUBTS_EMAIL`, `APP_ENV`.

---

## Brand

- Navy `#0B1E46` — primary
- Teal `#00989D` — secondary
- Orange `#EE5905` — CTAs

Clean and professional. Sidebar layout after login. App name **MOP Careers**.
Fully mobile-responsive. Text logo `MOP CAREERS` for now, wrapped in a clearly marked
slot so a logo image can be dropped in later.

---

## Structure — two faces

### 1. Public site (no auth)
About MOP Careers · Python Full Stack program overview · 55-day curriculum outline ·
45-day course + 45-day internship structure · outcomes section (placeholder content) ·
**Enquire Now** form (name, phone, email, message) → saved as `Enquiry` **and** emailed
to `ENQUIRY_EMAIL` · Login button.

### 2. Platform (auth)
Login + forgot password **only**. **No self-registration anywhere.** Forgot password
emails a reset link. Forced password change on first login.

---

## Roles

- **admin** — everything.
- **teacher** — only their assigned batches: mark class days complete, set dates, paste
  recording links, attach notes PDFs, take attendance, view their students' progress /
  resume scores / interview reports. **No** access to fees, placements, accounts, or
  other batches.
- **student** — own data only. Blocked students see *"Please contact MOP administration"*
  at login.

---

## Data model (core)

- **User** — name, email, phone, role, password_hash, must_change_password, is_blocked, yoe_it (students)
- **Batch** — name, course_type, start_date, status; **TeacherBatch** link table
- **Student** belongs to one Batch
- **CurriculumDay** — batch_id, day_number 1–55, topic, description, scheduled_date, status, recording_url, notes_file
- **Attendance** — student_id, curriculum_day_id, present
- **FeeRecord** — student_id, total_fee; **FeePayment** — student_id, amount, date, mode (UPI/cash/bank)
- **Company**; **Application** — student, company, role_title, status (applied/shortlisted/interviewing/offered/rejected/joined), package_lpa; **InterviewRound** — round_name, date, result, feedback
- **ResumeProfile** — summary, skills, education, experience, projects, certifications, links (JSON); **ResumeScore** — target_jd, score, feedback JSON, created_at
- **InterviewSession** — track, status, final_score, report JSON; **InterviewMessage** — role, content
- **Doubt** — student_id, query_type (class_doubt/technical/other), related_day, description, status (open/answered)
- **Enquiry** — name, phone, email, message, status (New/Contacted/Converted/Closed)
- **Milestone** per student — enrolled, batch_assigned, batch_started, midpoint_day28, course_completed, internship, placement_ready, offer_received (dates; some auto, some admin-ticked)

---

## Phases

### PHASE 1 — Foundation + Curriculum
- Auth: JWT, roles, forced password change, blocked check.
- Seed script: admin (`admin@mopcareers.com` / `Admin@123`), 1 teacher, 1 batch, 5 students.
- Admin panel: batches CRUD + teacher assignment, teacher/student account creation, block/unblock toggle.
- Curriculum pre-seed days 1–11: 1 Intro to Python & Setup · 2 Variables & Data Types ·
  3 Operators · 4 Strings · 5 Lists · 6 Tuples & Sets · 7 Dictionaries · 8 Conditionals ·
  9 Loops · 10 Loop Control: break/continue/pass · 11 Functions. Days 12–55 editable placeholders.
- Teacher workspace: mark day complete, set date, paste recording link, upload notes PDF,
  per-day attendance toggles, batch summary.
- Student: Home dashboard (roadmap milestone banner, next class card, stat cards —
  classes attended/55, attendance %, mocks taken, latest resume score) · Curriculum roadmap
  (per day: topic, recording link opens new tab, notes download, own attendance) ·
  Missed Classes with Watch Recording buttons · Schedule page (upcoming classes).

### PHASE 2 — Fees + Placements (admin)
- Fees: per-student total fee, payment entries, auto balance, pending-balance list,
  batch-wise collection summary. **Admin-only — students never see fees.**
- Placements: companies / applications / rounds CRUD, batch-wise stats dashboard
  (placed count, %, avg & highest package). Student side: read-only "My Applications".

### PHASE 3 — ATS Resume Builder
- Multi-step editable form: Summary → Skills → Education → Experience → Projects → Certifications → Links.
- Generate ATS-safe **single-column** PDF (no tables/graphics/columns) via reportlab; downloadable.
- **Score My Resume**: paste target JD → Anthropic call returns strict JSON
  `{score 0-100, keyword_match[], strengths[], improvements[]}` → gauge + lists → history saved.
  Teachers see own students' scores; admin sees all.

### PHASE 4 — AI Interviewer
- Chat UI. System prompt: professional technical interviewer for a Python Full Stack fresher
  role; **one question at a time**; cover Python, FastAPI, SQL, React; personalize 2–3 questions
  from the student's resume profile; ~8 questions; encouraging but honest.
  Send full history each call (the API is stateless).
- End Interview → final call returns strict JSON
  `{final_score, per_topic {python, fastapi, sql, react, communication}, strengths[], areas_to_improve[], verdict}`
  → report card page → "My Interviews" history. Teacher/admin visibility.

### PHASE 5 — Public site + Doubts + Polish
- Public pages + enquiry form (DB + email) + admin enquiries list with status.
- **Doubt Support**: form (type, related day optional, description). `class_doubt` emails the
  batch teacher; `technical`/`other` email `ADMIN_DOUBTS_EMAIL`. Subject:
  `[MOP Doubt] Day X — Topic — Student Name`. "My Queries" history with Open/Answered;
  admin/teacher can mark Answered.
- Certificate on Home: locked until the course-completion milestone, then a MOP-branded
  certificate (student name, course, dates) with download + Share on LinkedIn link.
- Loading states, error toasts, empty states, mobile responsiveness, role-guarded routes
  everywhere. Final README.

---

## Rules

- Students can **never** access other students' data; teachers **never** see unassigned batches.
- **Ask before adding any dependency outside the stack above.**
- Fix all errors in a phase before moving on.
- Work phase by phase: finish, run, and **verify** each phase before starting the next.
- **Commit to git after each phase**, and append a short progress note to this file.

---

## Verified environment (2026-07-25)

Python 3.13.2 · Node v22.17.0 (npm 10.9.2) · Git 2.50.1 · PostgreSQL 17.9
(service `postgresql-x64-17`, running).

> Note: Python 3.13 removed the stdlib `crypt` module, which older `passlib` builds import.
> Hashing is verified at setup time; if `passlib` misbehaves on 3.13 the `bcrypt` package
> (already in-stack) is used directly.

---

## Progress log

- **Setup** — Machine prerequisites verified (Python 3.13.2, Node 22.17.0, Git 2.50.1,
  PostgreSQL 17.9). The `postgres` password had been forgotten; reset via a scripted
  temporary `pg_hba.conf` `trust` window that the user ran themselves, with the original
  config restored automatically and verified afterwards. Role `mop` + database
  `mop_careers` provisioned.

- **Phase 1 — Foundation + Curriculum ✅ complete & verified.**
  - Backend: 7 tables via one Alembic migration (`users`, `batches`, `teacher_batches`,
    `curriculum_days`, `attendance`, `milestones`, `password_reset_tokens`).
  - Auth: JWT, bcrypt, forced first-login password change, blocked-user check,
    forgot/reset password with single-use SHA-256-hashed tokens.
  - Routers: `auth`, `admin`, `teacher`, `student`, `files`.
  - Seed: admin + 1 teacher + 1 batch + 5 students, curriculum days 1-11 fixed and
    12-55 placeholders, days 1-8 marked taught with attendance so dashboards have data.
  - Frontend: Vite + React 18 + Tailwind (brand palette), sidebar layout, role-guarded
    routes, admin/teacher/student screens, toasts, loading/empty/error states,
    mobile-responsive.
  - Milestones are fully wired: `enrolled`, `batch_assigned`, `batch_started`,
    `midpoint_day28` (day 28 complete) and `course_completed` (all 55 complete) stamp
    automatically and never overwrite an existing date; `internship`, `placement_ready`
    and `offer_received` are admin-ticked through the Roadmap modal on Admin > Accounts.
    Logic lives in `app/milestones.py`, shared by the admin and teacher routers.
  - Verification: **131/131 API assertions passed** across three suites. The first (78)
    covered auth, RBAC, role isolation (student cannot read other students; teacher 404s
    on unassigned batches), block/unblock, forced password change and validation. A
    second pass (33) closed a gap the first missed: notes PDF upload/download, including
    magic-byte validation, filename-traversal sanitising, replace/delete with on-disk
    cleanup, cross-batch and unassigned-teacher denial, and a full forgot-password round
    trip using the real token from the dev email log (single-use verified). A third (20)
    covered milestone auto-stamping across a whole batch, no-overwrite behaviour, admin
    ticking and clearing, and that students/teachers cannot edit milestones.
    Browser-verified all three roles, an actual notes download from the student UI, and
    the Roadmap modal.
  - **Frontend write paths verified in the browser** (an earlier pass had exercised most
    mutations through the API instead of the UI, which is exactly where form-wiring bugs
    hide): forced first-login change screen incl. mismatch validation; blocked-student
    message rendering on the login form; block/unblock toggle and badge; batch creation
    modal; account creation modal incl. the "students need a batch" toast and the
    auto-generated-password path; notes PDF upload through the real file input
    (change -> FormData -> axios) plus Remove with on-disk cleanup; and the complete
    forgot-password journey — request form, confirmation screen, following the real
    emailed link, length validation, reset, and signing in with the new password.

  Deviations & decisions worth remembering:
  - **bcrypt is used directly instead of passlib.** passlib 1.7.4 is broken against
    bcrypt 5.x (reads the removed `bcrypt.__about__`, then fails hashing). Both are
    named in the spec stack, so this is not a new dependency.
  - `npm create vite -- --template react` silently scaffolded the **vanilla-TS**
    template; it was removed and React 18.3.1 + `@vitejs/plugin-react` installed
    explicitly. React is pinned to 18 per spec.
  - The seeded admin/teacher/4-students skip the forced password change so the
    documented credentials stay usable; `eshwar.prasad@example.com` keeps the flag set
    to demonstrate the flow.
  - `DATABASE_URL` URL-encodes `@` in the password as `%40`, or the URL will not parse.
  - Stat cards for mock interviews and resume score render placeholders in Phase 1 and
    get wired up in Phases 4 and 3 respectively.

- **Phase 2 — Fees + Placements ✅ complete & verified.**
  - 5 new tables in one migration: `fee_records`, `fee_payments`, `companies`,
    `applications`, `interview_rounds` (12 tables total).
  - Fees (`/admin/fees`): set a per-student total, record and delete payments,
    pending-balance list, batch-wise collection summary. **Balance is never stored** —
    always `total_fee - sum(payments)`, so the two cannot drift.
  - Placements (`/admin/placements`): companies / applications / interview-rounds CRUD
    plus batch-wise stats. Student side is a read-only `/student/applications`.
  - Frontend: admin Fees and Placements screens, student My Applications, sidebar
    entries per role, rupee formatting via `Intl.NumberFormat('en-IN')`.
  - Verification: **83/83 API assertions passed**, plus **every Phase 2 write path
    driven through the browser**: recording a payment, the overpayment rejection,
    saving a changed total fee, removing a payment, the pending-only filter, the
    Companies tab, creating a company, creating an application (incl. its
    "pick both a student and a company" validation), adding an interview round,
    toggling its result, removing it, deleting an application, and both company-delete
    outcomes — refused with a count when applications reference it, allowed when unused.
    Zero console errors.

  Decisions worth remembering:
  - **Fees are locked at router level** (`dependencies=[Depends(require_admin)]` on the
    whole router) rather than per-endpoint, so a future endpoint added to that file
    cannot accidentally be exposed. Verified: students and teachers get 403 on every
    fee route, and no student-facing fee endpoint exists at all.
  - **"Placed" means status `offered` or `joined`** — joining is a later step and must
    not reduce the placement count. Package stats use the *best* offer per student, so
    someone with several offers is counted once at their strongest.
  - **Overpayment is refused** (400) rather than allowed to produce a negative balance.
  - A payment cannot be recorded before a total fee is set (400).
  - `StudentApplicationOut` deliberately omits the admin's private `notes` field and the
    `student_id`; the student schema is separate from the admin one rather than filtered.
  - Money crosses the API as a float purely so the JSON is a number, not a quoted
    string. Postgres `NUMERIC(10,2)` stays the source of truth and sums are computed
    with `Decimal` before conversion.

- **Next: Phase 3 — ATS Resume Builder (needs `ANTHROPIC_API_KEY` in `backend/.env`).**
