# MOP Careers — Project Spec & Working Agreement

Web platform for **MOP Careers**, a technology training institute. Two faces: a public
marketing site (no auth) and an authenticated platform (admin / teacher / student).

> **Read this first if you are picking the project up.** Phases 1, 2 and 5 are built,
> verified and **deployed live**. The public site has been rebuilt to a new design and
> all eight programme pages are complete and live.
>
> **The admin area so Bala can edit the site himself is BUILT, and thread 1 is
> closed.** Six tabs at `Admin > Website` — settings (incl. the standard fees),
> programmes and their whole detail pages, statistics, mentors, stories and
> hiring partners. Six seeded tables; nothing on the marketing site is
> hardcoded any more. **Read Open thread 2 before touching anything public**:
> a lot of what is live is unverified, and seven of the eight syllabi plus nine
> mentors were written in-session rather than by MOP. None of that needs a
> developer any more — it needs MOP's words.
>
> Jump to **"Open threads"** at the bottom — that is the live to-do list.
>
> **Thread 6 is closed too.** A batch is now built from its programme's own
> curriculum template and day count, so a Java batch no longer arrives holding
> 55 days of Python topics. Nothing in the platform assumes 55 any more.
>
> **Thread 4 is closed: all six roles are built.** Admin, teacher, student,
> Viewer, Contributor and Member. A contributor edits the public
> website but publishes nothing — every save queues for a member to approve or
> send back with feedback.
>
> **If you are starting fresh and want work to do**, the one item left with real
> substance is **object storage** in thread 1, which unblocks photo uploads and
> stops notes PDFs vanishing on redeploy. Everything else is either waiting on
> MOP or on a decision.
>
> **Most urgent regardless:** the free database expiry in thread 5. `backup.ps1`
> exists and is tested; a backup of production has not been taken.
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
- **contributor** — edits every word of the public website, but **publishes nothing**:
  each save becomes a pending change for a member to approve or send back with feedback.
  Onboards students and teachers, runs the class schedule and curriculum, and keeps
  placement records — those apply immediately. **Never sees fees or enquiries**, cannot
  block an account or create any role above a teacher.
- **member** — everything a contributor can, plus approving their changes, fees,
  enquiries, milestones, batch creation, account blocking, and the viewer's
  follow-up screens. Sits between Bala and the contributor.
- **viewer** — read-only across *every* batch: who teaches it,
  who is enrolled, which classes have been taught, whether the recording and notes were
  uploaded, and how many attended. Exists to chase whoever has fallen behind, so teachers'
  phone numbers are in its payloads. Never sees fees, placements, enquiries, doubts,
  website content or students' contact details. Its **only** write anywhere is logging
  its own phone calls (the chase log) — it cannot change a single class record.

---

## Data model (core)

- **User** — name, email, phone, role, password_hash, must_change_password, is_blocked, yoe_it (students)
- **Batch** — name, course_type, program_id, start_date, status; **TeacherBatch** link table
- **Student** belongs to one Batch
- **Program** — the public catalogue *and* the curriculum template: slug, name, published, `detail` (the page), plus `total_days` and `curriculum` (the day-by-day plan a new batch is built from)
- **CurriculumDay** — batch_id, day_number, topic, description, scheduled_date, status, recording_url, notes_file. How many a batch has comes from its programme; the count itself is never stored
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
- **Commit to git after each phase.**
- **Write the detailed note in [HISTORY.md](HISTORY.md), not here.** This file is
  loaded into every session, so anything added to it is paid for by every future
  conversation. It once reached 23k tokens that way. In CLAUDE.md, only update the
  open threads, the role definitions, and the one-paragraph summary under Progress
  log — everything else goes in HISTORY.md.

---

## Verified environment (2026-07-25)

Python 3.13.2 · Node v22.17.0 (npm 10.9.2) · Git 2.50.1 · PostgreSQL 17.9
(service `postgresql-x64-17`, running).

> Note: Python 3.13 removed the stdlib `crypt` module, which older `passlib` builds import.
> Hashing is verified at setup time; if `passlib` misbehaves on 3.13 the `bcrypt` package
> (already in-stack) is used directly.

---

## Progress log

**The detailed history lives in [HISTORY.md](HISTORY.md)** — every phase, every
decision worth remembering, and every bug worth not repeating. It is long, and
deliberately not here: this file is loaded into every session, so keeping a
finished history in it taxes every conversation.

Read HISTORY.md when you need the reasoning behind something. For ordinary work,
what follows is enough.

**What exists today**, in one paragraph. Phases 1, 2 and 5 are built and live: auth
with four roles' worth of screens, batches and curriculum, attendance, fees,
placements, the public marketing site, enquiries, doubts and certificates. The
whole marketing site is editable at `Admin > Website` — settings, programmes and
their syllabi, statistics, mentors, stories and hiring partners — backed by six
seeded tables, so nothing on the public site is hardcoded. A batch is built from
its programme's own curriculum template and day count, so a Java batch is not 55
days of Python. All six roles exist (admin, member, contributor, viewer, teacher,
student); a contributor edits the website but publishes nothing, and a member
approves or sends it back with feedback. A viewer watches every batch read-only
and logs the calls they make chasing missing recordings. Accounts are editable
— an admin or member can correct anyone they administer, including the login
email, and anyone signed in can fix their own name and phone at `/profile`.
22 tables, 10 migrations.

**Verification convention:** every piece of work above was checked with an API
assertion suite plus a browser walkthrough of the write paths, and the suites are
re-run together before a commit. They live in the session scratchpad rather than
the repo — worth knowing they existed, and worth writing fresh ones rather than
trusting that a screen still works because it did once.

---

## Open threads

Everything below is decided-but-not-built, or known-but-unresolved. This is the
to-do list.

### 1. Admin content management — ✅ DONE

Bala's words, via the user: he wants to *"just fill a form"* to add or remove a
course, a trainer or a story, change the fees, the WhatsApp number or the enquiry
email. He does not write code. This is a normal thing to build: a **Website** section
in the admin sidebar backed by real tables.

Everything on the marketing site is now editable at **Admin > Website**:
settings, programmes, mentors, stories and hiring partners. All five tables
ship seeded from what used to be hardcoded, so an empty list is a real answer
rather than "not set up yet".

The one piece left is **photos** — blocked on the object-storage decision
below. Mentors, stories and partners each accept an image *link* meanwhile,
which covers anything MOP already hosts.

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

**What this changes.** Every item in thread 2 below — the seven invented
syllabi, the nine fabricated mentors, the unverified quotes and packages, the
two unconfirmed programmes — used to need a developer and a git push. All of
them are now a form Bala can use himself. The content is still wrong; it is no
longer *expensively* wrong.

### 2. Content that is live but unconfirmed

The public site currently publishes a great deal nobody has verified. In rough order
of how much it would matter if wrong:

- **Seven of the eight syllabi were written in-session, not by MOP.** Only Data
  Science came from MOP's own material. Salary bands are market estimates; the
  Placements Exit company lists are the strongest claim on any page; AWS SAA, CEH
  and Security+ certification claims must match what is actually taught.
  **All of it is now editable at Admin > Website > Programs** — phases, topics,
  exit companies, salary bands, projects and FAQs — so correcting a syllabus is
  a form rather than a developer.
- **Nine mentors do not exist.** Still live, still visibly marked — but this no
  longer needs a developer. They are rows in the `mentors` table now, flagged
  as stand-ins, and **Bala can delete or replace each one at Admin > Website >
  Mentors in about a minute.** The screen counts them and says so at the top.
- **Cloud Computing and Cyber Security** appear only in the Emergent prototype. They
  are **not** on mopcareers.in and MOP has not confirmed it runs them. Both carry
  the `confirmed` flag unticked, which puts a banner on Admin > Website >
  Programs; untick **Show on the public site** there to take either down.
- **Real mentors' details and programme assignments are unverified.** One name was
  already wrong (Kuppola Rajesh → Vinay K), so the employers and years beside the
  other three are equally suspect. Who teaches what is inferred. Also editable
  at Admin > Website > Mentors now, including the programme tick-boxes.
- **The fee figures are MOP's own published prices and are not independently
  verified** — and they are almost certainly not identical across all eight
  programmes. They are editable at Admin > Website > Settings, with a
  per-programme override on each programme's editor.
- **Learner quotes and placement figures** (1,050+ placements, ₹47.6L highest, 500+
  partners, 87%) come from mopcareers.in — MOP's own claims, unverified against
  records, and no student has consented to being quoted here. The quotes, the
  company list and the ticker packages are all editable at Admin > Website now;
  and the four headline statistics are editable at Admin > Website >
  Statistics. **They remain the largest unverified claim on the site** — being
  editable makes them correctable, not true.
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

### 4. Six roles — ✅ ALL BUILT

All six exist: admin, teacher, student, viewer, contributor and
member. The two decisions that used to block this are answered — approval
**blocks** the change, and a contributor **does** edit public website copy —
and both are built to those answers. What remains is the record of what each
role is, kept here because it is the only place the whole ladder is written
down:

- ~~**Viewer**~~ — **built.** The earlier note here described it as "read-only;
  student count, tech stack, experience… described as HR", which turned out to
  be wrong about the job. The user's actual brief: a non-technical viewer
  who watches every batch, checks whether the class was taught and the
  recording and notes went up, and phones the teacher when they have not. Built
  to that. The privacy question that was open — MOP staff or external company
  HR — is **answered as internal staff**, which is why teachers' phone numbers
  appear. If an external-HR view is ever wanted it is a different role, not a
  setting on this one.
- ~~**Contributor**~~ — **built.** Edits every word of the public website, and
  publishes none of it: each save queues for a member. Onboards students and
  teachers, runs the class schedule and curriculum, keeps placement records —
  those apply immediately. Never sees fees or enquiries.
- ~~**Member**~~ — **built.** Approves or sends back with feedback, plus fees,
  enquiries, milestones, batch creation, account blocking and the viewer
  screens.

Confirmed and honoured: all sit under admin; one role per person (only admin acts
across roles, and never as a student); the three added roles are organisation-wide,
not batch-scoped.

**Still open, and now the only role question left:** whether teachers keep taking
attendance, or whether that moves to a contributor. Nothing was changed — teachers
still take it, and a contributor can too, because both pass `require_staff`.

A shareable summary of all six roles was produced for Bala:
<https://claude.ai/code/artifact/2fa3f337-6e8b-40bf-a65f-2283840a9d35>
It predates the build and describes Viewer as an HR-style read-only role, which
is not what was built.

**What is deliberately NOT in the approval queue**, in case it is wanted later:
onboarding (an account can be blocked afterwards; a wrong claim on the public
site cannot be un-read), the class schedule, curriculum and placement records.

### 5. Before real students use the live site

- **The free PostgreSQL database expires.** This is the only item here with an actual
  deadline, and when it lapses the database is *deleted* — students, batches,
  attendance, fees, placements, enquiries, and the six tables the public site now
  reads from. Find the expiry date in the Render dashboard under `mop-careers-db`
  and upgrade. Treat this as the most urgent thing on the whole list.
  **`backup.ps1` at the repo root now exists and is tested** — it dumps any
  database to a gitignored `backups/` folder and prints the matching
  `pg_restore` command. Verified against the local database: 21 tables
  captured. It does not remove the deadline, it makes lapsing survivable.
  Backups are manual; schedule the command if the data starts to matter.
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

### 6. Multi-programme internally — ✅ DONE

Every batch used to be built from one hardcoded 55-day Python outline, so a Java
batch arrived holding 55 days of Python topics. A batch is now built from its
programme's own template and day count, and nothing assumes 55.

What is left here is **content, not code**: seven of the eight programmes have a
day count (45) and no planned days, so their batches open as placeholders for the
teacher. Filling one in is a form at **Admin > Website > Programs > [programme] >
Class curriculum** — the same place the marketing syllabus is edited, in a section
marked internal. It needs MOP's curriculum, which nobody has supplied yet.

Two things worth knowing before touching it:

- **45 is a seeded default, not a verified fact.** It matches what the public site
  says and what the user stated, and every programme is almost certainly not the
  same length. It is one field per programme.
- **A batch's days are fixed at creation.** Correcting a template does not reach a
  batch already running, by design — those rows carry dates, recordings and
  attendance. A running batch is corrected day by day in the teacher workspace.

### 7. Phases 3 and 4 — no longer being built

The ATS resume builder and AI interviewer are **being bought in externally as a
separate product** and will be connected rather than built. Every trace of them
has been removed from the app: the student dashboard's "Mock interviews" and
"Resume score" cards, the admin dashboard's "Coming in later phases" card, and
the `mocks_taken` / `latest_resume_score` fields on `StudentDashboard`, which
only ever returned `0` and `None`. Nothing in the platform advertises them now.

`ANTHROPIC_API_KEY` remains empty and is no longer on the critical path.

### 8. Loose ends from the roles work

Small, known, and none of them blocking. Listed because they exist nowhere else.

- **Two members approving the same change at the same instant can apply it
  twice.** `approve()` checks `status == pending` and then applies, with no lock
  between the two, so a simultaneous double-click on an "add a mentor" proposal
  would create two mentors. Unlikely with three reviewers, but three people
  watching one queue is exactly where it happens eventually. Fix: claim the row
  with a single `UPDATE … WHERE status='pending'` that only one request can win,
  before applying anything. **This is a defect, not a feature.**
- **Two pending changes to the same item are not flagged.** With several
  contributors, two of them will eventually have edits queued against the same
  mentor or the same fee figure; approving both applies both, and the second
  silently overwrites the first. A line in the queue saying "another pending
  change also edits this" would stop a member approving contradictory edits
  without noticing.
- **The production migration was never directly confirmed.** The
  `website_changes` deploy was verified by the code being live and the app
  starting — migrations run in the start command, so a healthy backend implies
  the migration ran. Not proven, though: open **Website > Approvals** on the live
  site as admin, and if the page loads the table exists.
- **Two contributor permissions that fell out of where the guards landed**, worth
  a deliberate decision rather than leaving as an accident: a contributor can
  *edit* a batch and assign teachers to it but cannot create or delete one; and a
  contributor cannot edit or block the student and teacher accounts they created
  themselves, so they cannot fix their own typo. **Still true now that Accounts
  has an Edit button** — editing sits behind `require_member`, so a contributor
  sees no button rather than a 403. Admins and members can edit anyone they
  administer, including their email; anyone signed in can fix their own name and
  phone at `/profile`.

### 9. Bala's changes to the public site (2026-08-13) — ✅ BUILT

**All three are built and pushed**, plus the Careers page he asked for on the
14th, copied from `mopcareers.in/careers.php`. What is left here is content, not
code: the three legal pages are stubs at `/privacy-policy`,
`/terms-of-service` and `/refund-policy` waiting on MOP's wording (the user has
it); the five social URLs are still unsupplied, so the footer icon row stays
hidden; the careers openings are hardcoded in `Careers.jsx` rather than
admin-editable, which is the right follow-up if Bala wants to post roles
himself; and `contacts@mopcareers.in` has not been set — it is one field at
Admin > Website > Settings, and until it is, job applications go to whatever
address is configured there. **More changes were promised and have not arrived
yet.**

The original brief follows.

From the call on 13 Aug 2026, given as three screenshots. **More are coming —
the user said "will tell later", so treat this list as open, not complete.**

**Answered by the user, 13 Aug — the four open questions are now closed:**
the five nav entries come out of the nav bar **only** and every section stays
on the page; the footer's placement column lists **all eight** programmes, not
his six; the contact email is **`contacts@mopcareers.in`** (and is a site
setting, so Bala can correct it himself later without a developer); and the
three legal links go in **now** as links, with the pages written separately —
the user has the content for all three. **Still missing: the five social media
URLs.**

1. **Cut the top navigation down to two items.** Keep **Home** and the
   **Programs** dropdown. Remove *How it works*, *Outcomes*, *Mentors*,
   *Stories* and *FAQ*. Note those five are links to sections that still exist
   on the page — decide whether the sections stay and only the nav entries go
   (most likely), or whether the sections come out too. **Ask before deleting
   any section.**

2. **The hero button reads "Explore Placement Programs"**, not "Explore all 8
   programs". Note this drops the count, which is worth keeping dropped — the
   number was hardcoded into copy and would go stale the moment a programme is
   added or hidden.

3. **Rebuild the footer** to the four-column layout he showed:
   - **Certification courses** — *skip for now.* We do not have this category,
     and he agreed to ignore it. His version listed Full Stack Web Dev with AI,
     Python with AI, Digital Marketing with AI, Machine Learning with AI,
     Advanced Excel with AI, Data Science with AI, Generative AI, UI/UX Design
     with AI.
   - **Placement courses** — Full Stack Web Development with AI, Data Science
     with AI, Data Analytics with AI, Generative AI / AI Agents & Agentic AI,
     Cybersecurity & Ethical Hacking, Cloud Computing & DevOps. **That is six,
     and the site currently publishes eight programmes** — reconcile before
     building, do not silently drop two.
   - **Company** — About Us, Contact Us, Careers.
   - **Contact** — `contacts@mopcareers.in`, `+91 98908 13235`, "Ground Floor,
     No. 10, 14th Main, 5th Sector, HSR Layout, Bangalore South, Bangalore,
     Karnataka, India – 560102".
   - Social icons: LinkedIn, Twitter/X, Instagram, YouTube, Facebook. **URLs
     were not supplied — ask.**
   - Bottom bar: "© 2020 - 2026 MOP CAREERS SOFTWARE SERVICES PVT LTD. All
     rights reserved." plus Privacy Policy, Terms of Service, Refund Policy.
     **Those three pages do not exist** — they need writing, or the links need
     to point somewhere real rather than 404.

**The contact email in his footer is `contacts@mopcareers.in`.** The live site
publishes `hello@mopcareers.com`. This is the conflict already recorded in
thread 2, and his screenshot is the closest thing to an answer we have — but it
is a third spelling, not a confirmation. **Confirm with him before changing it**,
and note the domain differs from the site's own (`.in` vs `.com`, see thread 3).

Everything here is public-site content and layout, so most of it is editable at
Admin > Website once built; the nav, the button copy and the footer structure
are code.
