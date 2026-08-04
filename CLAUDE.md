# MOP Careers — Project Spec & Working Agreement

Web platform for **MOP Careers**, a technology training institute. Two faces: a public
marketing site (no auth) and an authenticated platform (admin / teacher / student).

> **Read this first if you are picking the project up.** Phases 1, 2 and 5 are built,
> verified and **deployed live**. The current open work is a public-website redesign.
> Jump to **"Open threads"** at the bottom — that is the live to-do list.
>
> - Live site: <https://mop-careers.onrender.com>
> - Live API: <https://mop-careers-api.onrender.com> (`/docs` for the API browser)
> - Repo: <https://github.com/VenkataVinayBabu/mop-careers> (private, branch `master`)
> - Deployment: see `DEPLOY.md`

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

- **Phase 5 — Public site + Doubts + Polish ✅ complete & verified.**
  - 2 new tables: `enquiries`, `doubts` (14 tables total, 3 migrations).
  - Public marketing site at `/` — hero, About, programme structure (45+45), the
    55-day curriculum outline, outcomes (placeholder figures, clearly labelled),
    Enquire Now form and a Login button. No auth anywhere on it; a signed-in visitor
    is redirected to their own dashboard instead.
  - `POST /public/enquiries` is the only unauthenticated write on the API, so it
    carries an in-process per-IP throttle (5/hour) on top of Pydantic validation.
    The enquiry is saved *before* the email is attempted, so a mail failure never
    loses a lead.
  - Doubt Support: `class_doubt` emails the batch teacher(s), `technical`/`other` go to
    `ADMIN_DOUBTS_EMAIL`. Subject is exactly `[MOP Doubt] Day X — Topic — Student Name`
    (`General` when no day is given). "My Queries" for students; a shared inbox
    component for admin and teacher, with teachers scoped to their own batches.
  - Certificate: MOP-branded reportlab PDF (landscape A4, navy/teal/orange), generated
    in memory. Locked until the `course_completed` milestone; the download endpoint
    403s otherwise. LinkedIn add-to-profile deep link alongside the download.
  - Verification: **60/60 API assertions passed**, and **every UI write path driven
    through the browser before reporting done**: public enquiry submit (plus its 429
    rate-limit state rendering correctly), admin enquiry status change and delete,
    student doubt submission with the day topic resolving, admin mark-answered,
    teacher inbox scoping, and the certificate in both locked and unlocked states
    including a real download. Verified a clean console in a fresh tab.

  Decisions worth remembering:
  - The rate limit is in-process, so restarting the backend clears it. Fine for a
    single-process deployment; a multi-process one would need Redis.
  - `Doubt.related_day` stores the day *number*, not a `CurriculumDay` FK, so a doubt
    survives the batch's curriculum rows being edited or rebuilt.
  - A class doubt from a batch with no assigned teacher falls back to the admin address
    and logs a warning, rather than silently going nowhere.
  - The certificate is never written to disk — there is nothing worth caching, and it
    keeps it un-fetchable by guessing a filename.

- **Multi-programme correction (public site only).** The original brief described MOP
  Careers as "a Python Full Stack bootcamp", so everything was built around one
  programme. MOP actually runs several — confirmed so far: **Python Full Stack, Java
  Full Stack, Gen AI** (DevOps was mentioned but not confirmed, so it is not listed).
  - The public site now lists all three, each with its own description, topic list and
    "who it's for". The catalogue lives in one file, `frontend/src/data/programmes.js` —
    adding a programme is a single entry, nothing else changes.
  - **Durations and start dates are deliberately not shown anywhere on the public
    site**, per instruction. Verified with a regex sweep of the rendered page.
  - Enquiries gained a `programme` column so leads are tagged by interest; it appears
    in the admin list and in the notification email's subject line.
  - The certificate now takes its course name from `batch.course_type` rather than a
    hardcoded constant, so a Java student no longer receives a certificate naming
    Python. Verified by flipping a batch to Java and back.

  **Still single-programme internally, and deliberately so:** `TOTAL_CURRICULUM_DAYS`
  is a global 55, and `curriculum.py` seeds the Python day 1-11 topics into *every*
  new batch regardless of course type. A Java batch created today gets 55 days of
  Python topics. Making that per-course is the real multi-course work — it needs a
  `Course` entity, per-course curriculum templates and a per-course day count, and it
  was consciously deferred. The user also noted "every course is 45 days" for later;
  the platform still assumes 55.

- **UI pass — collapsible sidebar, student profile menu, progress report ✅.**
  - Sidebar collapses to an 80px icon rail on all three roles, with `lucide-react`
    icons (an agreed new dependency), hover tooltips, and the state remembered in
    localStorage. The mobile drawer always shows full labels regardless.
  - Student sidebar footer opens a profile menu upward: avatar, name, batch chip,
    a Progress tile, Profile Settings, Reset Password, Sign Out. Teachers and admins
    keep the plain card.
  - New `/app/profile` (student edits own name, phone, experience only — email, role,
    batch and blocked status stay with admin; verified an admin gets 403) and
    `/app/progress` (date range, four summary cards, day-by-day detail).
  - Password fields across login / forced change / voluntary change / reset now have a
    show-hide toggle via a shared `PasswordInput`.

  **A bug worth remembering:** the Tailwind navy ramp defined 50-400 and 600-900 but
  **skipped 500**. Every `text-navy-500` was therefore a class that did not exist — no
  colour applied, text inherited whatever surrounded it. It looked fine in most places
  by luck and rendered near-invisible in the profile menu. 21 usages across 9 files
  were affected. Fixed by adding 500 to navy, teal and orange. If a colour ever looks
  wrong, check the shade actually exists in `tailwind.config.js`.

- **Deployed to Render ✅.** `render.yaml` at the repo root defines all three services
  (PostgreSQL, FastAPI backend, React static site). Migrations run on every deploy via
  the start command. Pushing to `master` auto-deploys.
  - Managed hosts hand out `DATABASE_URL` as `postgres://`, which SQLAlchemy 2.0
    rejects. `settings.sqlalchemy_url` normalises it — do not remove that.
  - The live database was seeded from a laptop against Render's External Database URL,
    then the published `Admin@123` was replaced. **Admin@123 no longer works in
    production**; teacher and student demo passwords are unchanged.

---

## Open threads

Everything below is decided-but-not-built, or known-but-unresolved. This is the
to-do list.

### 1. Public website redesign — the current work

The user's words: *"Need lot of changes in public website."* Details were still being
gathered when the previous session ended. What is already known:

- **A logo exists** and needs adding. `frontend/src/components/Logo.jsx` has a marked
  swap slot — drop the file in `frontend/src/assets/` and flip `USE_IMAGE_LOGO`.
  Every screen picks it up at once.
- The logo carries the tagline **"Your Future. Our Priority."**, which appears nowhere
  on the site yet.
- The logo's blue/teal differs slightly from the brand navy `#0B1E46` — worth
  reconciling rather than having two blues.
- **The Java Full Stack and Gen AI content is invented.** It was drafted as a
  placeholder and flagged in `frontend/src/data/programmes.js`. It has never been
  confirmed by MOP and must not go in front of real visitors as-is.
- Outcomes figures (6-9 LPA, 4 interview rounds) are clearly-labelled placeholders.
- The site has **no** photos, testimonials, address, phone number, map, social links,
  trainer profiles or FAQ.
- **Durations and start dates are deliberately absent** from the public site, per
  instruction. Do not reintroduce them without asking.

### 2. Six roles — blocked on Bala

Three roles exist (admin, teacher, student). Three more are specified but not built:

- **Viewer** — read-only; student count, tech stack, experience. Described as "HR".
- **Contributor** — updates next scheduled class, curriculum, placement details, and
  possibly public website content.
- **Member** — reviews and approves what a Contributor entered.

Confirmed: all sit under admin; one role per person (only admin acts across roles, and
never as a student); the three new roles are organisation-wide, not batch-scoped.

**Two decisions block this work**, and both determine whether the stated one-week
launch is achievable:

1. Does approval **block** the change, or happen **after** it? Review-after is a
   fraction of the work; approval-first does not fit in a week.
2. Does a Contributor need to edit **public website copy**? That means building a
   content editor — likely the largest single item, and it does not fit in a week.

Also unresolved: whether Viewers are MOP staff or external company HR (a privacy
question, not just permissions — recommend an anonymised or opt-in view if external),
and whether teachers keep attendance.

A shareable summary of all six roles was produced for Bala:
<https://claude.ai/code/artifact/2fa3f337-6e8b-40bf-a65f-2283840a9d35>

### 3. Before real students use the live site

- **Change `Teacher@123` and `Student@123`.** They are guessable and the site is on
  the public internet. Remove the demo accounts entirely before enrolment.
- **SMTP is unconfigured**, so password resets and notifications only reach the Render
  logs. Nobody can actually recover an account.
- **Uploaded notes PDFs vanish on redeploy** — Render's free tier has no persistent
  disk. Needs a paid disk or object storage (S3 / Cloudflare R2).
- The free database is time-limited and the free web service sleeps when idle, so the
  first request after a quiet period takes 30-60 seconds.
- A test enquiry named **"Deploy Check"** may still be in Admin > Enquiries.

### 4. Still single-programme internally

`TOTAL_CURRICULUM_DAYS` is a global 55 and `curriculum.py` seeds the Python day 1-11
topics into *every* new batch regardless of course type. **A Java batch created today
gets 55 days of Python topics.** The public site advertises three programmes, so this
is the gap between what is sold and what the platform does. Fixing it needs a `Course`
entity, per-course curriculum templates and a per-course day count. The user also
noted "every course is 45 days" for later.

### 5. Phases 3 and 4 — no longer being built

The ATS resume builder and AI interviewer are **being bought in externally** and will
be connected rather than built. The student dashboard still shows "Mock interviews"
and "Resume score" placeholder cards pointing at those phases.

`ANTHROPIC_API_KEY` remains empty and is no longer on the critical path.
