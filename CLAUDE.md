# MOP Careers — Project Spec & Working Agreement

Web platform for **MOP Careers**, a technology training institute. Two faces: a public
marketing site (no auth) and an authenticated platform (admin / teacher / student).

> **Read this first if you are picking the project up.** Phases 1, 2 and 5 are built,
> verified and **deployed live**. The public site has been rebuilt to a new design and
> all eight programme pages are complete and live.
>
> **The admin area so Bala can edit the site himself is under way.** Site settings
> are built (`Admin > Website`); courses, mentors and stories are next — see Open
> thread 1. **Read Open thread 2 before touching anything public**:
> a lot of what is currently live is unverified, and seven of the eight syllabi plus
> nine mentors were written in-session rather than by MOP.
>
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
    "who it's for". The catalogue lived in one file, `frontend/src/data/programmes.js`
    (since replaced by `courses.js` in the site rebuild below) —
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

- **Public site rebuilt to a new design ✅ live.** MOP supplied the real logo and an
  AI-generated prototype (Emergent) as the design direction, of which the
  `index-home.html` variant was chosen. The structure and typography follow it; the
  colour does not.
  - **Colour was remapped to MOP's brand.** The reference runs blue `#2563EB` and
    amber `#F59E0B` on warm off-white. Keeping that would have put the navy-and-teal
    logo on a borrowed palette, so: near-black → navy, blue → teal, amber → orange.
    The warm ground `#FAFAF7` was kept and is the new `paper` token.
  - **Two deepened variants exist purely for contrast**: `teal-ink #00787C` and
    `orange-ink #C24A04`. Brand teal and brand orange both fall below 4.5:1 against
    the cream ground at small sizes, so small text and filled buttons use these; the
    brand values stay for display type, where 3:1 is the bar. Fourteen pairings were
    checked and all pass.
  - **Typography: Inter (variable, 400–800) + Instrument Serif italic**, both
    self-hosted `.woff2` under `src/assets/fonts` — latin subset, SIL OFL, no CDN
    request and no npm dependency. The serif has **four jobs and no others**: the
    second clause of a section heading, course card index numerals, display
    statistics, and statistic suffixes. It never sets body copy — quotes included.
  - **`Inter` had never actually been loading.** It was named in `tailwind.config.js`
    from the start with no `@font-face` anywhere, so every screen in the app —
    including all three dashboards — had been silently falling back to Segoe UI.
  - **The logo is one supplied PNG, turned into three variants** (`logo.png`,
    `logo-white.png`, `logo-mark.png`) plus a favicon. Background removal was done by
    treating each pixel as a blend along one of two lines in colour space
    (background→navy, background→teal) and recovering the coverage, which gives true
    alpha and no grey fringing — a plain colour-key leaves halos. The tagline's left
    rule runs *underneath* the P and overlaps it horizontally, so the mark could not
    be isolated with a vertical crop; it was removed as a connected component
    instead. `index.html` had never linked a favicon at all.
  - New public routes: `/` and `/courses`. Shared header/footer live in
    `pages/public/PublicChrome.jsx`.
  - Requested changes, all live: only the nav is sticky (it was pinned at `top:36px`
    to clear the announcement bar, which left it visibly misaligned on scroll-up);
    WhatsApp removed from the navbar but kept as the floating button and in the
    contact block; Login routes to `/login` and on to each role's home; statistics
    count up from zero on scroll into view; the two lead courses carry a written
    "Course details" link while the other six are arrow-only.

  Decisions worth remembering:
  - **Content lives in `src/data/courses.js` and `src/data/site.js`, deliberately
    shaped like the API rows they will become.** When courses and site settings move
    into the database, the swap is a change of import, not a rewrite of the pages.
  - **`published: false` on a course removes it everywhere** — listing, filter,
    enquiry dropdown, and every count, which are all derived rather than hardcoded.
    That is the escape hatch for anything MOP turns out not to run.
  - **Card heights are reserved with `min-h`, scoped to `sm:` and up.** Copy length
    alone cannot hold a row level, because line counts move with viewport width and
    font size. Below `sm` everything is single column, where there is nothing to
    align against and a reservation only adds dead space.
  - **A reservation is a floor, not a ceiling.** Measured: a 300-character
    testimonial takes the stories row from 238px to 368px and opens a 130px gap under
    the shorter cards. Nothing breaks; it just looks sparse. The fix belongs at the
    input — a ~200 character limit with a live counter — not at the render.
  - **Learner quotes are never padded to fit.** Those are words attributed to named
    people; stretching a testimonial to fill a layout is inventing what they said.
    Pillar and mentor copy *was* lengthened, because MOP owns those words.
  - **`line-clamp` was rejected for testimonials.** Silently swallowing half of what
    someone typed looks like a broken site to whoever entered it.
  - **The arrow on a card is a real button whenever the text label is absent**, and
    carries the course name — otherwise it is six identical unlabelled arrows to
    anyone using a keyboard or screen reader. On the two lead cards the label and
    arrow are a single button, so the arrow is clickable without adding a second tab
    stop.

  Bugs found and fixed along the way:
  - **Login always failed on the first attempt after a quiet period.** The axios
    client had a 20s timeout; the free Render backend takes 30–60s to wake. The retry
    only ever worked because the failed attempt had woken the server. Timeout is now
    75s, `warmUp()` pings `/health` from the landing and login pages so the server
    starts waking while the visitor reads, and a notice appears after 6s explaining
    the wait. A silent minute in front of a spinner reads as broken.
  - **`CountUp` sat at zero forever in dev.** It used a `useRef` as a run-once guard,
    but refs survive StrictMode's mount→unmount→remount: the first pass claimed the
    guard and started the animation, the cleanup cancelled it, and the second pass
    refused to run. `observer.disconnect()` inside the callback already gives
    run-once semantics, so the ref just had to go.
  - **A second `colors` key in `tailwind.config.js` silently wiped the brand
    palette** — a duplicate key in the same object literal, so navy/teal/orange
    vanished and the build failed on `bg-navy-50`. Merge into the existing block.

  Verification: build clean; no horizontal overflow at 375, 768, 1280 or 1440; both
  fonts confirmed genuinely loading rather than falling back (the serif measures
  220.5px where Georgia would be 282.6px); count-up lands exactly on its targets;
  course filter tested across every category including the singular "1 course";
  mobile menu, floating WhatsApp and the mobile CTA bar checked for collision; all
  card sections confirmed uniform **on the deployed site**, not just locally.

  A note on verifying deploys: matching the live bundle filename against a local
  build hash does **not** work — Render compiles its own bundle and line-ending
  conversion alone changes the hash. Check the deployed bundle's *contents* instead.

- **"Courses" renamed to "Programs" across the public site ✅ live.** MOP calls them
  programmes. Copy, section ids, data file, components and routes all follow. The
  signed-in app keeps `course_type` and `course_completed` — those are database
  column names and renaming them is a migration, deliberately not done.
  - **There is no separate programs page.** All eight appear on the home page, so a
    second copy was only somewhere else to keep in sync. `/programs` and `/courses`
    both redirect to `/#programs`.
  - Nav gained **Home** first, and **Programs** is a dropdown listing every published
    programme with its badge. It opens on hover *and* focus — hover-only leaves it
    unreachable by keyboard. On mobile the drawer expands the list inline.
  - Two new sections: **"What is Pay After Placement, really?"** (replaced a
    seven-step process strip that told the same story twice) and **Refer & Earn**
    (₹10,000, unconfirmed, behind an `enabled` flag).

- **Program detail pages at `/programs/{slug}` ✅ live.** One template, eight pages.
  - Sections in order: hero + "what's included" card, why, roadmap, roles, syllabus,
    technologies, projects, **mentors**, career services, fees, FAQ, hiring partners,
    enquiry, related programs.
  - **Every section is optional** — a programme with no projects has no projects
    section rather than an empty shell. Content arrives programme by programme.
  - **Global vs per-programme is the whole trick.** Written naively each page needs
    ~120 pieces of content, or 960 across eight. Roadmap, career services, hiring
    partners, fee structure and most FAQs do not vary, so they live in `site.js` and
    are written once — bringing per-programme authoring down to roughly 40 items.
  - **Placements Exit** is kept from the reference and is the best idea on it: each
    phase names the calibre of employer you are ready for at that point, rising
    through the programme. Those company lists need to be true.
  - Syllabus phases are labelled **Phase 1–4 with no month**. The reference pinned
    them to JAN/APR/JUL/OCT, which only works with one intake a year.
  - Fees come from `DEFAULT_FEES` in `site.js` and can be overridden per programme.
    Almost certainly not identical across all eight.
  - One phase open at a time; opening another closes the first, and the clicked
    header is scroll-compensated so it does not jump out from under the cursor.

  **Content provenance — important.** Only Data Science with AI came from MOP's own
  prototype. **The other seven syllabi were written from scratch in-session**: 32
  syllabus phases, 32 projects, 32 role descriptions with salary bands. Plausible and
  industry-standard, but not MOP's curriculum and unreviewed by anyone there. Salary
  bands are market estimates. Certification claims (AWS SAA, CEH, Security+) must be
  checked against what MOP actually teaches.

- **People on the site.**
  - `MENTORS` carry a `programs` array of slugs; that is what puts a mentor on a
    programme page. Assignments are inferred from each mentor's speciality line, not
    confirmed.
  - `Avatar` renders a real portrait when `photo` is set, otherwise a monogram on a
    brand tint. Tints cycle by list position, not by hashing the name — hashing kept
    collapsing to two colours across four cards.
  - **Nine fabricated mentors are live**, flagged `placeholder: true`, with employer
    "Placeholder · N yrs" and "replace before launch" in the speciality line. Find
    them with `grep -n "placeholder: true" src/data/site.js`.
  - **Stock photos were tried and removed.** The free pools are overwhelmingly
    Western; searches for Indian portraits return documentary street photography.
    A stranger's face under a real mentor's name is worse than no face.
    `src/assets/people/README.md` documents sizes and the two-line swap.

  Bugs found and fixed in this stretch:
  - **Scroll position was not reset on navigation.** Clicking a programme card
    halfway down the home page opened its detail page halfway down. `ScrollToTop` in
    `App.jsx` fixes it, skipping hash URLs and POP navigations so Back still restores.
  - **A component declared inside another component's render body** gets a new
    identity every state change, so React rebuilt the subtree and fired `mouseleave`
    on the node being removed — closing the nav dropdown the instant hover opened it.
    Inlined the JSX instead.
  - **Sections scrolled to via the nav landed under the sticky header.**
    `scroll-margin-top: 88px` on `section[id]`.
  - Grid items stretch by default, which left ~170px of dead white under the hero
    card. `lg:self-start`.

  Two verification lessons worth keeping:
  - **Matching a string in the deployed bundle is not proof of deploy.** The string
    may already exist in the previous build. Poll until the bundle *hash* changes,
    then check behaviour in a browser.
  - **The automated browser pane often lacks window focus** (`document.hasFocus()`
    false) and does not composite. Hover, focus events, `requestAnimationFrame` and
    IntersectionObserver all silently do nothing. Twice this looked like a code bug
    and was not — verify with a full page load before chasing it.

- **Admin content management, part 1 — site settings ✅.** The first piece of
  Bala's "just fill a form" request. `Admin > Website` now edits the contact
  details, the WhatsApp number and its pre-filled message, the announcement
  strip, four social links, and the two addresses notifications are delivered
  to. 1 new table (`site_settings`), 15 tables total, 4 migrations.
  - **The public site no longer needs the backend to be awake.** This was the
    open question that blocked the whole thread, and it is answered without
    paying for an always-on instance. `SITE_DEFAULTS` is compiled into the
    bundle and paints on frame one; a localStorage snapshot of the last API
    answer overlays it synchronously; the API answer overlays that when it
    arrives. A failed or slow fetch costs a stale footer, never a blank page —
    **verified with the backend stopped and the cache cleared**, where the
    whole site still rendered with only network errors in the console.
  - `ENQUIRY_EMAIL` and `ADMIN_DOUBTS_EMAIL` are no longer redeploy-only. The
    settings row wins when set and the `.env` value is the fallback, so
    nothing breaks for an install that never touches the screen.

  Decisions worth remembering:
  - **`site_settings` is key/value, not a wide row.** The set of fields the
    marketing site exposes is still moving, and key/value lets a new field ship
    as a Pydantic field plus a form entry instead of a migration each time. The
    API still presents a typed object, so no loose keys escape. A missing row
    means "never set" and the default applies.
  - **The public payload and the admin payload are different schemas.**
    `enquiry_email` and `doubts_email` are internal delivery addresses and are
    not in `GET /public/site-settings` at all — the site publishes `email`
    (hello@…), which is a different thing. Asserted in the suite.
  - **The form sends only what changed**, and the API treats an absent field as
    "leave alone". A stale tab saving one field cannot blank the rest.
  - **Backend `DEFAULTS` and frontend `SITE_DEFAULTS` must stay identical.**
    The page paints the frontend copy and swaps in the API's answer a moment
    later, so any disagreement is a visible flicker on a cold visit. Both files
    say so at the top.
  - **Live settings are read through `useSite()`, never by importing
    `SITE_DEFAULTS`.** A component importing the defaults keeps showing the
    built-in copy after an admin edits it. The store is a plain
    `useSyncExternalStore` rather than context, because `whatsappLink()` and
    `contactHref()` are called from ordinary functions, not only components.
  - **The admin router carries its own `require_admin` dependency**, the same
    way fees does. Everything on it edits what the whole internet sees, which
    is the wrong place to forget a guard.
  - **The announcement strip got an on/off switch** rather than relying on an
    empty message, and the tag pill is dropped when cleared so the strip never
    carries a stray orange pill with nothing in it.
  - **Every input on the form is `type="text"`, including the email fields.**
    `type="email"` hands the browser its own validation, which blocks submit
    with a native bubble, bypasses the inline messages, and disagrees with the
    API about whether blank is allowed. One validator.

  Verification: **55/55 API assertions passed** — the public/admin payload
  split, 401/403 for anonymous, teacher and student on both read and write,
  eight rejected values and four accepted blanks, WhatsApp normalised to digits
  for `wa.me`, emails trimmed and lowercased, partial update leaving untouched
  fields alone, booleans round-tripping, unknown keys ignored, an empty body
  being a no-op rather than a wipe, `updated_by`/`updated_at` recorded, and
  enquiry mail falling back to `.env` when the setting is blank. In the browser:
  the form loading real values, typing updating the dirty counter, a 422
  rendering its message under the offending field with an orange border and
  `aria-invalid`, a successful save clearing the dirty state, and the public
  site then serving real `wa.me` links and a LinkedIn icon that were not there
  before. Clean console in a fresh tab; one settings fetch, not two, despite
  StrictMode's double mount.

  A verification note: **do not `resize_window` the automated pane wider than
  it really is.** Emulating 1280 on a ~540px pane left the layout stretched but
  the paint clipped, so screenshots showed a stale frame and coordinate clicks
  landed nowhere. At native width everything worked. Even then the pane's
  synthetic clicks and key presses land only intermittently — pressing Enter in
  a focused field submitted the form when six clicks on the button did not.

---

## Open threads

Everything below is decided-but-not-built, or known-but-unresolved. This is the
to-do list.

### 1. Admin content management — Bala's request, and now the priority

Bala's words, via the user: he wants to *"just fill a form"* to add or remove a
course, a trainer or a story, change the fees, the WhatsApp number or the enquiry
email. He does not write code. This is a normal thing to build: a **Website** section
in the admin sidebar backed by real tables.

Scope, in the order it should be built:

1. ~~**Site settings**~~ — **built.** See the progress log entry above.
2. **Courses** — the biggest entity, and it carries the detail pages above.
   `programs.js` is ~900 lines of nested content per program (syllabus phases,
   projects, roles, FAQs), so this one does *not* fit the flat key/value shape
   site settings used. It needs real tables.
3. **Mentors, stories, companies** — same shape as each other, one pass.
   Smaller than courses and higher value: deleting a fake mentor is currently a
   git push, and there are nine of them live (thread 2).
4. **Photos** — blocked on the storage decision below.

The decisions this raised:

- ~~**The public site would start depending on the backend, which sleeps.**~~
  **Answered.** Baked-in defaults paint first, a localStorage snapshot of the
  last API answer overlays them synchronously, and the API answer overlays that
  when it arrives — so there is no blank page even with the backend fully down.
  Verified. The same pattern carries the remaining entities, which makes the
  ~$7/mo always-on instance a **nice-to-have rather than a prerequisite**. It is
  still worth paying for once real students are enrolled, because the *signed-in*
  app has no such fallback and eats the cold start on every login.
- **Photos need object storage.** Mentor and student portraits, company logos.
  Uploads currently go to local disk, which Render's free tier wipes on every deploy
  — already true of the notes PDFs, and far more visible on a marketing site.
  Cloudflare R2's free tier covers it.
- **Live edits go live instantly.** Site settings ship without a published switch
  because every field has a graceful blank state; courses, mentors and stories all
  need one. This is also the natural home for the "Member approves what a
  Contributor entered" idea in thread 3.

**Also decided for this work:** the testimonial field gets a ~200 character limit
with a live counter. A longer quote does not break the layout but drags the row
taller and hollows out the other cards — constrain the input rather than truncating
what someone wrote.

**Why this is now the priority.** The programme pages are built and the site is
complete. What remains is almost entirely *content correction* — seven invented
syllabi, nine fake mentors, unverified figures, two unconfirmed programmes. Every
one of those currently needs a developer and a git push. Built once, Bala fixes his
own syllabus or deletes a fake mentor in about a minute. The data files are already
shaped like the API rows, so the swap is an import change.

### 2. Content that is live but unconfirmed

The public site currently publishes a great deal nobody has verified. In rough order
of how much it would matter if wrong:

- **Seven of the eight syllabi were written in-session, not by MOP.** Only Data
  Science came from MOP's own material. Salary bands are market estimates; the
  Placements Exit company lists are the strongest claim on any page; AWS SAA, CEH
  and Security+ certification claims must match what is actually taught.
- **Nine mentors do not exist.** Flagged `placeholder: true` and visibly marked, but
  live. `grep -n "placeholder: true" src/data/site.js`.
- **Cloud Computing and Cyber Security** appear only in the Emergent prototype. They
  are **not** on mopcareers.in and MOP has not confirmed it runs them. Both are
  flagged `confirmed: false` in `programs.js`; set `published: false` to remove them.
- **Real mentors' details and programme assignments are unverified.** One name was
  already wrong (Kuppola Rajesh → Vinay K), so the employers and years beside the
  other three are equally suspect. Who teaches what is inferred.
- **Learner quotes and placement figures** (1,050+ placements, ₹47.6L highest, 500+
  partners, 87%) come from mopcareers.in — MOP's own claims, unverified against
  records, and no student has consented to being quoted here.
- **Contact details conflict across MOP's own properties.** The site shows
  `hello@mopcareers.com`, `+91 98908 13235`, HSR Layout Bengaluru. mopcareers.in
  publishes `hello@mopcareers.in` and a Whitefield address. Both are live and
  disagreeing.
- **The WhatsApp number is still unknown.** The setting is empty, so the buttons
  fall back to the enquiry form. Do **not** assume the phone number above takes
  WhatsApp — a landline or a number without it hands the visitor a dead end.
  Bala can now fill this in himself at **Admin > Website**, along with the
  conflicting email, phone and address above — none of those needs a developer
  any more.

### 3. Domain

MOP owns **mopcareers.com** — currently a GoDaddy "Launching Soon" placeholder. The
decision between pointing that at Render, keeping mopcareers.in, or running both was
deferred. Whenever it happens, three env vars must move with it or the site breaks
quietly: backend `CORS_ORIGINS` and `FRONTEND_URL` (the latter appears in password
reset emails), and frontend `VITE_API_URL` — which is **baked in at build time**, so
saving it in the dashboard does nothing until the frontend is redeployed.

Auto-deploy is confirmed **On Commit** for both `mop-careers` and `mop-careers-api`.

### 4. Six roles — blocked on Bala

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

### 5. Before real students use the live site

- **The free PostgreSQL database expires.** This is the only item here with an actual
  deadline, and when it lapses the database is *deleted* — students, batches,
  attendance, fees, placements, enquiries, all of it. Find the expiry date in the
  Render dashboard under `mop-careers-db` and either upgrade or take backups. Treat
  this as the most urgent thing on the whole list.
- **Change `Teacher@123` and `Student@123`.** They are guessable and the site is on
  the public internet. Remove the demo accounts entirely before enrolment.
- **SMTP is unconfigured**, so password resets and notifications only reach the Render
  logs. Nobody can actually recover an account.
- **Uploaded notes PDFs vanish on redeploy** — Render's free tier has no persistent
  disk. Needs a paid disk or object storage (S3 / Cloudflare R2).
- **The backend sleeps when idle** (30–60s to wake). Mitigated in the frontend — 75s
  timeout, a warm-up ping, and a notice after 6s — but not solved. A free uptime
  monitor hitting `/health` every 10 minutes keeps it awake; note Render allows 750
  free instance-hours a month and 24/7 uptime burns about 730 of them. The static
  site itself is CDN-served and does **not** sleep.
- A test enquiry named **"Deploy Check"** may still be in Admin > Enquiries.

### 6. Still single-programme internally

`TOTAL_CURRICULUM_DAYS` is a global 55 and `curriculum.py` seeds the Python day 1-11
topics into *every* new batch regardless of course type. **A Java batch created today
gets 55 days of Python topics.** The public site advertises three programmes, so this
is the gap between what is sold and what the platform does. Fixing it needs a `Course`
entity, per-course curriculum templates and a per-course day count. The user also
noted "every course is 45 days" for later.

### 7. Phases 3 and 4 — no longer being built

The ATS resume builder and AI interviewer are **being bought in externally** and will
be connected rather than built. The student dashboard still shows "Mock interviews"
and "Resume score" placeholder cards pointing at those phases.

`ANTHROPIC_API_KEY` remains empty and is no longer on the critical path.
