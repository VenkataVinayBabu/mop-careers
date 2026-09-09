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
> **⏸ PAUSED 9 SEP 2026 — the team moved to a different project.** Everything
> outstanding on that day is gathered in one place at the top of **"Open
> threads"**, under the heading *PAUSED — 9 September 2026*. Read that first;
> the numbered threads below it are the reasoning behind each item.
>
> Nothing is broken — the site is live, the platform works, and the last commit
> deployed cleanly. **The five quickest wins are listed there**, three of which
> are admin edits somebody can do without a developer.
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
> **If you are starting fresh and want work to do**, the substantial items are
> done: email works, uploads survive a deploy, and the site is live on
> mopcareers.com. What is left is either waiting on MOP (thread 2's unverified
> content), waiting on AWS (App Runner, thread 3a), or small — photo uploads
> now that S3 exists, and changing the demo passwords in thread 5.
>
> **The AWS migration has started, and Stage 1 (RDS) is DONE** — the data is
> restored onto AWS and verified (thread 3a). Nothing has moved off Render
> yet: the live site still runs there, against Render's database. The next
> step is proving AWS with the live site by repointing one env var, and it
> reverts by changing that same var back.
>
> - **Live site: <https://mopcareers.com>** — AWS Amplify, since 5 Sep 2026.
>   `www` serves the same site; the canonical is the apex.
>   <https://mop-careers.onrender.com> still runs and still works.
> - Live API: <https://mop-careers-api.onrender.com> (`/docs` for the API browser)
>   — **still on Render.** App Runner is blocked by an AWS account issue, so the
>   site is served from AWS and the API answers from Render.
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
- **sales** — works the leads and nothing else. Sees the enquiries that came off
  the public website, moves them through New/Contacted/Converted/Closed as they
  are chased, and downloads the list as a spreadsheet. **One screen, which is
  also where they land at login.** No batches, students, fees, placements,
  doubts, applications or website — not "sees and is refused", but cannot reach
  at all. Cannot delete an enquiry: chasing a lead and destroying the record of
  one are different jobs.
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
28 tables, 20 migrations.

**Verification convention:** every piece of work above was checked with an API
assertion suite plus a browser walkthrough of the write paths, and the suites are
re-run together before a commit. They live in the session scratchpad rather than
the repo — worth knowing they existed, and worth writing fresh ones rather than
trusting that a screen still works because it did once.

---

## Open threads

Everything below is decided-but-not-built, or known-but-unresolved. This is the
to-do list.

---

# ⏸ PAUSED — 9 September 2026

**The team moved to a different project on 9 Sep 2026.** Everything below this
line is what was outstanding on the day, gathered into one list so nobody has
to read thirteen threads to find out where things stand. The numbered threads
after it hold the reasoning; this is the index.

**Nothing is broken.** The site is live at <https://mopcareers.com>, the
platform works, email works, and the last commit deployed cleanly. What
follows is unfinished, not failing.

### Do these first if the project restarts

Three of them are five-minute admin edits that have been outstanding for days,
and two are live-content problems.

| # | What | Where | Owner |
|---|---|---|---|
| 1 | **Untick Josna P and Bharath David.** Four mentors are published; the user asked for two — Balaram and Vinay K. | Admin > Website > Mentors | MOP |
| 2 | **Clear the bootcamp's hidden tuition fields.** `₹1,20,000 + GST` and *"payable only after you accept an offer"* are still stored on the bootcamp, inherited from the programme it was edited out of. Invisible while "One fee, paid upfront" is ticked; publishes the instant anyone unticks it. | Admin > Website > Programs > Python Full Stack Bootcamp > Fees | MOP |
| 3 | **Confirm the struck-through ₹6,999.** The bootcamp shows ₹4,999 with ₹6,999 crossed out. Only lawful if it genuinely was that price — misleading pricing is an offence under Indian consumer rules. | same screen | MOP |
| 4 | **Change `Teacher@123` and `Student@123`,** or delete the demo accounts. They are in `backend/app/seed.py` and the site is on the public internet. | seed / Accounts | Developer |
| 5 | **Decide whether Full Stack Web Development is gone deliberately.** The bootcamp was created by editing that programme, so it took its id and the course is no longer offered — nine programmes became eight. `/programs/full-stack-web-development` now redirects home. The sitemap has been regenerated to match. | — | Bala |

### Waiting on AWS — two support cases, both open since early September

| Case | Raised | Consequence while it waits |
|---|---|---|
| **SES production access** | 5 Sep. AWS asked for use-case detail; the case sat at *Pending customer action* because the request form never offered a description field. **It will wait indefinitely until somebody replies.** | SES only delivers to verified addresses. Enquiry and doubt notifications work. **Password resets to students, new-account emails and class doubts to teachers all fail silently.** |
| **App Runner entitlement** | 6 Sep. The console returns the free-plan limitations page although the account is Paid and Active (confirmed via `GetAccountPlanState`). Amplify was unaffected. | The API stays on Render. It works. The cost is cross-region latency — data requests went from ~0.3s to ~1.0s once the database moved to Mumbai and the API did not. |

### Money and security, on a clock

- **The AWS credits run out around January 2027.** $120 sounds like a year; at
  the current rate it is roughly four months, because the account carries a
  second RDS instance belonging to a different MOP product. **Decide who pays
  for AWS before then**, not after — it is the same shape of deadline as the
  Render expiry that caused the September scramble.
- **Render's database is still running and still paid** (~$6/mo), deliberately,
  as the rollback. The two have forked; anything written since 5 Sep exists
  only on RDS. Cancel it once AWS has been trouble-free for a while.
- **The RDS security group still allows Render's shared outbound ranges.**
  Those ranges are shared with every Render customer in the region, so the
  database is currently protected by its password and SSL rather than by the
  firewall. **Delete both rules the day the API runs inside AWS.**
- **Backups are manual and must now target RDS**, not Render. `backup.ps1` with
  `BACKUP_DATABASE_URL` set. Worth scheduling before students enrol.
- **The API sleeps when idle** — 30-60s on the first sign-in after a quiet
  period. ~$7/month on Render removes it. Only affects signing in; the public
  site is CDN-served and does not sleep.

### Content MOP still owes — none of it needs a developer

All of it is a form at Admin > Website. It is listed at length in thread 2.

- **Photos.** The entire live site contains **two images, and both are the
  logo.** No mentor has a photograph, no learner story has a face, there is no
  classroom or office shot. For a business selling people teaching people this
  is the largest credibility gap left, and it is the one thing money cannot
  fake later. S3 exists; **upload buttons do not** — mentors, team and partners
  still take an image URL.
- **The four headline statistics** — 1,050+ placements, ₹47.6L highest, 500+
  partners, 87%. MOP's own published claims, never checked against records.
  The biggest unverified thing on the site.
- **Seven of the eight syllabi were written in-session, not by MOP.** Salary
  bands are market estimates and the Placements Exit company lists are the
  strongest claim on any page.
- **The five social URLs.** Still unsupplied, so the footer icon row stays
  hidden and `sameAs` is left out of the Organization schema — one of the
  stronger signals for tying a new domain to a known brand, which is exactly
  the .com's problem against the .in and .co.in.
- **Cloud Computing and Cyber Security** are published but MOP has never
  confirmed it runs them. Both carry `confirmed` unticked.
- **The WhatsApp number differs from the published phone.** `916364805505`
  against `+91 98908 13235`. Presumably deliberate; nobody has confirmed it.

### Code that is known, scoped and unbuilt

Ranked by what each is worth.

1. **Prerendering the public pages.** Every URL on the site serves the same
   5,523 bytes with **zero body text and no `<h1>`** — it is a client-rendered
   SPA. Google executes JavaScript so it does eventually index; Bing, WhatsApp,
   LinkedIn and the AI crawlers do not. The `.in` site serves 69,094 bytes of
   readable HTML by comparison, which is part of why it outranks the `.com`.
   **The fix is a build-time prerender, not a Next.js rewrite** — snapshot each
   public route into `dist/<route>/index.html` after `vite build`; Amplify
   serves a real file before applying the SPA rewrite. Same React app, no
   framework change. It also gives per-page social previews, which `useSeo.js`
   documents itself as unable to provide. The trade-off: content edited in
   Admin reaches visitors instantly but crawlers only at the next build.
   **Scoped and offered on 8 Sep; the user said leave it.**
2. **No analytics at all.** Confirmed again 9 Sep — no gtag, GTM, Plausible or
   PostHog on the live page. Nothing counts a callback request or a WhatsApp
   click, so nobody can say whether the site converts. **Needs a decision
   first:** GA4 is free but sets cookies and therefore needs a consent notice;
   Plausible is ~$9/month, cookieless, about twenty lines.
3. **655 KB of JavaScript in one chunk** (175 KB gzipped). Every visitor
   downloads the admin screens, the teacher workspace and the student dashboard
   in order to read the marketing page. Route-based code splitting is the only
   real performance lever here — there are no images to compress.
4. **Photo upload buttons.** S3 and `app/storage.py` exist and work for notes
   PDFs; nothing else uploads through them.
5. **Two approval-queue defects** (thread 8): two members approving the same
   change simultaneously can apply it twice, and two pending changes to the
   same item are not flagged.
6. **Accessibility odds and ends** (thread 12): 19 tap targets below the WCAG
   2.2 AA floor of 24x24, one heading-level skip (`h2 -> h4`), and a contrast
   audit that needs a real tool — the script used flagged 11 styles but cannot
   resolve gradient backgrounds and most looked like false positives.

### Where the deployment record lives

`MOP_Careers_AWS_Deployment.pdf` — 14 pages, the whole migration with the six
AWS console screenshots MOP captured and redacted. **Deliberately not in git**
(`*.pdf` is gitignored): it is a ~1 MB binary rebuilt whole each time, and an
editor reading it as text reports it as a 465-line change. Regenerate it from
the scratchpad script if it is ever needed again; the copy for sharing lives in
the project folder, which is inside OneDrive.

---

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
- ~~**Photos need object storage.**~~ **The storage exists now** (S3,
  6 Sep 2026 — see thread 5), so this is no longer blocked on a decision. What
  is still true is that **nothing uploads photos yet**: mentors, team members
  and partners take an image URL, and only notes PDFs go through
  `app/storage.py`. Wiring an upload button to the same module is now ordinary
  work rather than a prerequisite.
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
- ~~**Nine mentors do not exist.**~~ **Off the public site, 7 Sep 2026.**
  `GET /public/mentors` now drops any row flagged `is_placeholder`, so a
  fabricated mentor cannot reach a visitor even if one is created again; the
  baked-in fallback in `frontend/src/data/site.js` was cut from 13 people to
  the two MOP has confirmed, **Balaram and Vinay K**. The rows still exist and
  the admin screen still lists all 13, which is deliberate — they have to be
  findable to be replaced.

  **Josna P and Bharath David are not placeholders and are therefore not
  filtered.** The user asked for only Balaram and Vinay K live, so those two
  need unticking at Admin > Website > Mentors. Until that is done they are
  published.
- **Human Resource Management (HRM) is deliberately NOT published here.** MOP
  lists ten placement programmes on mopcareers.in; this site publishes nine.
  The user was asked and said not to add it (15 Aug 2026). Its content exists
  at `mopcareers.in/hrm-hub.php` if that is ever reversed — do not add it back
  on the grounds that the counts disagree.
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
- ~~**Contact details conflict across MOP's own properties.**~~ **Resolved.**
  Both sites publish the same HSR Layout address and the same phone
  `+91 98908 13235` — the "Whitefield address" once recorded here was wrong.

  **The email is answered too: `contacts@mopcareers.com` exists and receives**
  (Microsoft 365 through GoDaddy, 6 Sep 2026, MX and SPF in Route 53, verified
  by sending to it). ~~The public site still publishes `hello@mopcareers.com`~~
  **Corrected — the live site publishes `contacts@mopcareers.com`** (checked
  against `/public/site-settings`, 9 Sep 2026).

  `enquiries@` and `support@` are planned as aliases into the same mailbox.
  Once they exist AND SES has production access, `ENQUIRY_EMAIL` and
  `ADMIN_DOUBTS_EMAIL` on Render should move off the personal Gmail they
  currently point at.
- ~~**The WhatsApp number is still unknown.**~~ **Set — `916364805505`**
  (checked 9 Sep 2026). Note it is a *different* number from the published
  phone `+91 98908 13235`, which is deliberate as far as anyone knows but has
  not been confirmed with MOP.

  **Still unsupplied: the five social URLs.** `social` is empty, so the footer
  icon row stays hidden — and `sameAs` is left out of the Organization schema
  for the same reason (thread 12), which costs the .com one of its better
  signals against the .in and .co.in.

### 3a. Hosting moves to AWS — in progress

**Bala's decision, 15 Aug 2026: AWS.** Render goes away entirely. This
supersedes the earlier Azure decision; [DEPLOY_AZURE.md](DEPLOY_AZURE.md) is
kept only because the sequencing argument in it still applies.

[DEPLOY_AWS.md](DEPLOY_AWS.md) is the step-by-step. The mapping is RDS for
PostgreSQL, App Runner, Amplify Hosting and S3. `apprunner.yaml` and
`amplify.yml` are committed at the repo root, so neither console has to be
told the build commands by hand.

**Stage 3 (Amplify) and Stage 5 (the domain) are DONE (5 Sep 2026), out of
order — App Runner is blocked, so the frontend went first and calls Render's
API.** `mopcareers.com` and `www` serve from Amplify with an Amplify-managed
certificate; DNS is Route 53 (nameservers changed at GoDaddy, the GoDaddy
Website Builder records are gone, the `_dmarc` TXT was carried across). The
SPA rewrite rule is set in the console — without it every deep link 404s.
Render's `CORS_ORIGINS` now lists the Amplify URL, the apex and `www`; miss
that and the site silently shows baked-in defaults instead of live data,
which looks completely normal and is not.

**Stage 2 (App Runner) is BLOCKED.** The console returns the free-plan
limitations page even though the account is on the Paid plan and Active
(confirmed via `GetAccountPlanState`). Amplify was unaffected, so it is
specific to App Runner. **Support case raised 6 Sep 2026** — "App Runner
unavailable in ap-south-1 — account is on the Paid plan", filed under Account
and billing > Account > Other Account Issues, since Activation is not offered
as a category. Alternatives if it stays blocked: Lightsail (~$10/mo, you manage
the server, TLS and deploys) or EC2.

**Nothing about the site depends on this.** The API runs on Render and works;
what App Runner buys is removing the cross-region database latency (data
endpoints went from ~0.3s to ~1.0s once the database moved to Mumbai) and
letting Render be switched off entirely.

**Stage 0 and Stage 1 are done (4 Sep 2026).** Account `MOP Careers` in
**ap-south-1 (Mumbai)**, root MFA on, a $40/month budget set, **$120 of
credits expiring 2 Sep 2027**.

**`mop-careers-platform-db`** is live: PostgreSQL **18.6**, `db.t4g.micro`,
20 GiB gp3, Single-AZ, database `mop_careers`, master user `mop`. The
September dump restored into it and verified — 28 tables, schema version
`4677a2788420` matching the code, `users=7 programs=9 batches=1`. Snapshot
`mop-careers-platform-restored-2026-09-04` is the known-good point.

**There is a second RDS instance, `mop-careers-db`, and it is NOT ours.** It
runs PostgreSQL 16.15 and belongs to a different MOP product. **Do not delete
it.** It is also why the bill is ~$30/month rather than ~$15, which halves
the credit runway to roughly four months.

**Stage 1.5 is DONE (5 Sep 2026): the live site now runs on RDS.** The
Render API's `DATABASE_URL` points at `mop-careers-platform-db`, proved by
writing an enquiry through the live API and finding it in RDS and not in
Render's database. `FRONTEND_URL` was corrected to `https://mopcareers.com`
at the same time — it still said the old Render URL, so every password-reset
link would have pointed at the wrong site. `APP_ENV` was already `production`.

**Render's database is still running and still paid, deliberately.** It is
the rollback: put the old `DATABASE_URL` back and the site is exactly where
it was. The two have now forked, so anything written since the cutover exists
only on RDS. Cancel Render's database once a week or two has passed without
trouble — and note that **backups must now target RDS**, not Render.

**`mop-careers-platform-sg` allows Render's shared outbound ranges**
`74.220.48.0/24` and `74.220.56.0/24`, described as temporary. Those are not
unique to this account — they are shared with every other Render customer in
the region, so the database is protected by its password and SSL rather than
by the firewall. **Delete both rules once the API runs inside AWS**, which is
what makes the database properly private.

Four things worth knowing before starting:

- **The deadline that drove this is gone.** The database is on Render's paid
  $6/month plan and does not expire (thread 5). This is now an unhurried
  migration, which is worth spending: nothing has to be rushed, and Render
  stays up until AWS is proven.
- **The free plan is credits, not the old 12-month free tier.** $120 covers
  roughly four months at the current two-instance rate. When the credits go,
  so does free access — the same shape as the Render expiry, so decide
  whether MOP is paying for AWS *before* Stage 2 doubles the burn rate.
- **It costs money.** Roughly $25/month for the first year and $40/month
  after, almost all of it App Runner. Against $6/month for what is running
  today — so the case for moving has to rest on something other than the
  database bill. Lightsail is ~$10/month instead of App Runner, at the cost of
  managing the server, TLS and deploys by hand.
- **Do the database first, and prove it before moving hosting.** Restoring
  into RDS and pointing the *existing* Render backend at it tests the data on
  AWS while everything else stays put, and reverts by changing one env var.
- **`UPLOAD_DIR` is configurable** (`backend/app/config.py`), but there is no
  good answer for it on App Runner — those containers are ephemeral, exactly
  like Render's. Notes PDFs keep vanishing on deploy until S3 (Stage 4), which
  needs a code change to `backend/app/routers/teacher.py`.

**`restore.ps1` (repo root) is the restore half of `backup.ps1`**, written for
this migration and tested against the local database. It picks the newest dump
and newest client, refuses to restore over a non-empty database, stops on the
first error, and afterwards checks the table count *and* that the dump's
`alembic_version` matches the migration head the code expects. Use it rather
than a hand-typed `pg_restore` — it also keeps the password out of shell
history and forces `sslmode=require` on remote hosts.

### 3. Domain

MOP owns **mopcareers.com**, bought through GoDaddy. **Decided 4 Sep 2026:
the site goes live on AWS at mopcareers.com.** That closes the question that
sat open here since August — it is no longer a choice between Render, the .in
and both.

**There are THREE MOP domains, not two** (found 4 Sep 2026):

| Domain | State | Google, searching "mop careers" |
|---|---|---|
| `mopcareers.co.in` | live, 200 — "MOP Careers — India's career readiness platform" | **ranks #1** |
| `mopcareers.in` | live, 200 — "India's Best Pay After Placement Program" | ranks #2 |
| `mopcareers.com` | GoDaddy Website Builder, serves nothing | not indexed |

**This is the thing to understand before promising anyone that the .com will
rank.** A brand-new domain does not outrank two established ones by publishing
similar content — Google has years of signals on those two and none on the
.com. Three sites saying the same thing compete with each other and split what
they earn.

Making the .com win needs, in order of how much each matters:

1. **301-redirect `.co.in` and `.in` to the `.com`.** This is what actually
   moves ranking; everything else is marginal beside it. **It is Bala's
   decision, not a developer's** — those sites are live and may serve
   different business lines (the .co.in advertises certification courses,
   the .in advertises pay-after-placement).
2. **The site's own SEO, which is currently close to none.** One `<title>` and
   one description for every route, no `robots.txt`, no `sitemap.xml`, no
   Open Graph tags — so WhatsApp and LinkedIn shares show no preview card at
   all, and nine programme pages look to Google like one page.
3. **Google Search Console** — verify the domain, submit the sitemap.

**Still open, and it needs Bala rather than a developer:** what happens to
**mopcareers.in**, which is live today and presumably carries whatever search
ranking MOP has. Two sites publishing the same content compete with each
other and split it. The .in should either 301-redirect to the .com or serve
something deliberately different.

**As of 4 Sep 2026 mopcareers.com resolves but serves nothing.** The apex and
`www` point at `13.248.243.5` / `76.223.105.230` — GoDaddy's Website Builder,
which shows as a "Website" product beside the domain in Bala's GoDaddy
account — and HTTPS returns no response at all. `mopcareers.in` is live and
serves 200 from `66.116.209.139`.

Two consequences. **Nothing real is live on the .com**, so pointing it at AWS
breaks nothing. But **those A records belong to the GoDaddy Website Builder
product** and have to be removed rather than edited around, or they will keep
answering for the apex. Whenever it happens, three env vars must move with it or the site breaks
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

- ~~**The free PostgreSQL database expires on 3 SEPTEMBER 2026.**~~ **SETTLED,
  3 Sep 2026 — the database is on the paid $6/month plan and has no expiry.**
  It did expire on the day and was **suspended for about an hour**: the data was
  never deleted (Render gives 13 days' grace) but it was *locked* — a suspended
  database refuses connections, so `backup.ps1` could not run either. The
  signed-in platform was down; the public marketing site kept serving because
  of the baked-in defaults, though it silently showed last month's eight
  programmes instead of nine. Upgrading to `0.1c-256mb` — **identical specs to
  the free tier, $6/month, it simply does not expire** — resumed it and every
  row came back.

  **The lesson worth keeping: a backup is useless if you wait for the deadline
  to take it.** The plan was always "back up, then upgrade"; the expiry made
  that order impossible, and only the 19-day-old August dump existed at the
  moment it mattered.

  **Current backup: `backups/mop-careers_remote_2026-09-04_003338.dump`**,
  108.9 KB, **28 tables** — the August one has 26 and predates `assignments`
  and `assignment_submissions`, so it would restore a database the code no
  longer matches. Use the September one for the AWS migration.

  `backup.ps1` needs a `pg_dump` **at least as new as the server** (PostgreSQL
  18 on Render); it picks the newest client installed rather than whatever is
  on PATH. Backups are still manual — worth scheduling once students enrol.
- **Change `Teacher@123` and `Student@123`.** They are guessable and the site is on
  the public internet. Remove the demo accounts entirely before enrolment.
- ~~**SMTP is unconfigured**~~ **DONE, 5 Sep 2026. Email works — password resets
  included.** Amazon SES in ap-south-1, domain `mopcareers.com` verified with
  Easy DKIM (SES published the CNAMEs into Route 53 itself). Verified by
  submitting a real enquiry on the live site and receiving it in an inbox, not
  in spam — so DKIM is aligned and the `p=quarantine` DMARC policy passes.

  **`SMTP_PORT` must be 2587, not 587.** Render blocks outbound traffic to
  ports 25, 465 and 587 on free web services to deter spam, so a connection to
  SES times out after 20 seconds with `TimeoutError: timed out` — which reads
  like a broken credential and is not. SES also listens on 2465 and 2587 for
  exactly this situation. **Do not "fix" the port back to 587.** If the API
  ever moves to a paid instance or to AWS, 587 becomes available again, but
  2587 keeps working either way.

  **Notifications go to `contacts@mopcareers.com`** (6 Sep), set at Admin >
  Website > Settings rather than in .env. Verified live: an enquiry submitted
  on mopcareers.com arrives as `[MOP Query] <name> — <programme>`.

  **Bounces and complaints reach a human.** SES publishes both to the SNS topic
  `mop-careers-ses-notifications` (ap-south-1), which emails
  `contacts@mopcareers.com`. Delivery notifications are deliberately off — at
  this volume they would bury the two that matter. When one arrives, correct or
  remove that address on the account it belongs to: repeated hard bounces are
  what damages sending reputation, and a damaged reputation puts legitimate
  password resets in spam.

  **SES is still in the sandbox**, which is the one thing left. It delivers
  only to addresses verified as SES identities — `contacts@mopcareers.com` and
  one Gmail are, so enquiry and doubt notifications work. **Everything aimed at
  somebody else does not:** password resets to a student, new-account emails,
  and class doubts to a teacher all fail silently until production access is
  granted. Requested 5 Sep. **AWS replied asking for use-case detail and the case sat at
  "Pending customer action"** — the request form never offered a description
  field, so they received almost nothing and it will wait indefinitely until
  someone answers. Check the banner on SES > Account dashboard, and the case
  itself in AWS Support > Your support cases.
- ~~**Uploaded notes PDFs vanish on redeploy**~~ **FIXED, 6 Sep 2026.** They go
  to S3 now — bucket `mop-careers-uploads` in ap-south-1, all public access
  blocked, objects under `notes/`. `app/storage.py` chooses: `S3_BUCKET` set
  means S3, empty means local disk, so a developer still needs no AWS
  credentials to run the app. Permission is unchanged and still decided in
  `files.py` before any URL exists; downloads are a redirect to a link that
  expires in five minutes. The IAM user can only put/get/delete under
  `notes/` in that one bucket.
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

**The day-by-day planner was removed on 8 Sep 2026, deliberately.** It let
someone write each class day into the programme, so a new batch arrived
pre-filled. The user was offered it twice — including a paste-the-whole-sheet
box to make 45 rows a single action — and declined both times, on the grounds
that **MOP hands the day plan out in the brochure and again after a student
enrols**, so transferring it into the website editor duplicates a document that
already exists and has no reader. It also sat inside the marketing-site editor,
which was the wrong home for a teaching plan. What remains there is one field,
now titled **Batch length**: how many days a batch runs.

**Nothing was deleted.** `Program.curriculum` still exists, the API still
accepts and returns it, `build_curriculum_days()` still uses it, and the one
programme that has planned days (python-full-stack, 11) keeps them and still
builds batches from them — the editor simply passes the stored value straight
through, which was verified by saving through the rebuilt form and confirming
all 11 survived. Restoring the editor means bringing `CurriculumTemplate` back
from git history and one JSX tag in `WebsiteProgramEditor.jsx`.

**The consequence, which is now the intended behaviour:** a batch of a
programme with no planned days gets days titled *"To be announced"*, and the
teacher fills each in as they teach it. Students see that in their roadmap
meanwhile. If that ever becomes unacceptable, the fix is the paste box, not
re-typing.

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
- ~~**The production migration was never directly confirmed.**~~ **Confirmed,
  4 Sep 2026.** The September production dump restored onto RDS contains
  `website_changes`, and `GET /admin/website/changes` returns 200 against it
  with the app running. The table exists in production and the migration ran.
- **Two contributor permissions that fell out of where the guards landed**, worth
  a deliberate decision rather than leaving as an accident: a contributor can
  *edit* a batch and assign teachers to it but cannot create or delete one; and a
  contributor cannot edit or block the student and teacher accounts they created
  themselves, so they cannot fix their own typo. **Still true now that Accounts
  has an Edit button** — editing sits behind `require_member`, so a contributor
  sees no button rather than a 403. Admins and members can edit anyone they
  administer, including their email; anyone signed in can fix their own name and
  phone at `/profile`.

### 10. Assignments, scores and a leaderboard — ✅ BUILT

Asked for and built on 15 Aug 2026, pushed as `0774a4e`. Two tables
(`assignments`, `assignment_submissions`), ten endpoints across the teacher,
student and viewer routers, and four screens: the student's list and paper,
the staff editor at *a batch > Assignments*, and the viewer's least-complete-
first list. The student progress report gained an Assignments card counting
work set on class days inside the selected range.

**What is left here is not code.** Nobody has written a real assignment yet
beyond test data, and the Placement Readiness Test the Data Analytics page
advertises ("Assignments · Mock Interviews · 80%+ Score Required") is still
only copy — there is no pass mark anywhere in the platform, and no link
between an assignment score and placement readiness. If MOP wants the 80%
gate to mean something, that is a separate piece of work.

The brief, in the user's words:

- a **teacher gives assignments** to students
- a **viewer** sees, per batch, how many students have completed one
- **students see their own scores**
- a **leaderboard**

Two things to know before designing it.

**The site already promises this.** The Terms & Conditions published on 15 Aug
list "complete assignments" under learner responsibilities, and the Data
Analytics programme page lists Assignments as a step in its Placement Readiness
Test. Both are MOP's own copy and neither is backed by anything. Presumably
assignments happen over WhatsApp today.

**A leaderboard contradicts a rule this project has held since Phase 1:**
"Students can never access other students' data." A ranking that shows names
and scores is exactly that. It needs a deliberate decision — anonymised
positions, first names only, opt-in, or an explicit exception — rather than
being built past the rule without noticing.

**Decided by the user, 15 Aug — the four design questions are closed:**

- **MCQs for now**, auto-graded. Coding questions come later, and those will be
  a link the student works on and submits, the way resumes already are — which
  is why submissions must not assume a file.
- **Attached to a curriculum day**, alongside its recording and notes. Progress
  then lines up with the syllabus and the teacher workspace already has the day.
- **The leaderboard shows first names and scores, but only to students who have
  completed that assignment.** This is what reconciles it with "students never
  see other students' data": you see the ranking by earning it, and nobody can
  browse the class's results without sitting the test themselves.
- **Teachers, admin, members and contributors** can all set assignments —
  contributors already run the class schedule and curriculum.

**Decided while building, and worth knowing:**

- **One attempt.** A leaderboard built on scores that can be retaken until
  perfect is not a leaderboard. Retakes would need a teacher to reopen it.
- **Correct answers are never sent to a student before they submit.** The
  student-facing payload strips them server-side rather than hiding them in the
  UI, because anything in the response is one devtools tab away.
- **The leaderboard is per assignment, within the batch.** A student sees the
  people they actually study beside, not every learner MOP has.

### 9. Bala's changes to the public site (2026-08-13) — ✅ BUILT

**All three are built and pushed**, plus the Careers and About pages, the
application form behind Apply Now, and admin screens for both new content
types. What is left here is content, not code:

- ~~The three legal pages are stubs~~ **Written and live** at
  `/privacy-policy`, `/terms-of-service` and `/refund-policy` — 45 headings
  across the three in `frontend/src/data/legal.js`, including the PAP-specific
  clauses. All three return 200.
- The five social URLs are still unsupplied, so the footer icon row stays
  hidden.
- `contacts@mopcareers.in` has not been set — one field at Admin > Website >
  Settings, and until it is, application notifications go wherever
  `enquiry_email` points.
- **About Us is still half hardcoded.** Mission, vision, the six core values,
  the six programme summaries and the four statistics are in `About.jsx`. Only
  the people are editable. Note the four statistics there are *about.php's*
  (1,050+ / 500+ / 47.6 LPA / 87%) and deliberately differ from the
  `statistics` table the landing page uses — MOP publishes two different sets
  and nobody has reconciled them.
- The careers **benefits** list is still hardcoded; only the openings moved.

**Now editable at Admin > Website**, both through the approval queue like
every other content type:

- **Openings** — the roles on `/careers`. Closing a role unpublishes it rather
  than deleting, so it can be reopened without retyping.
- **Leadership & team** — the About page's people, split by a `section`
  column into "Our Leadership" and "Our Team". Separate from `mentors` on
  purpose: a mentor teaches a programme and appears on programme pages.

Applications submitted through Apply Now land in `job_applications` and are
read at **Admin > Applications** by admin, member *and* contributor — a
deliberate departure from the rule that contributors never see enquiries, on
the grounds that hiring is not admissions. Deleting one stays member-and-above.
Resumes are **links, not uploads** (object storage still does not exist), so
they can rot; the screen says so.

Photos may now be a path on this site (`/team/vinay.jpg`, committed under
`frontend/public/`) as well as an absolute URL — the only free, non-expiring
option until object storage lands.

**More changes were promised and have not arrived yet.**

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

### 11. The Python Full Stack Bootcamp — code done, programme not created

Asked for 7 Sep 2026: **45 days, ₹4,999 paid upfront, one project. Not Pay
After Placement.** MOP interviews students afterwards and the ones who qualify
move into a PAP programme where they do two more projects — **and the user was
explicit that none of that goes on the bootcamp page.** Bootcamp and PAP are
sold as different things.

**The code is built, live and dormant.** One tick-box at *Admin > Website >
Programs > [programme] > Fees* — "One fee, paid upfront" — sets
`detail.fees.upfrontOnly`, and the programme page then drops everything
written for PAP: the hero eyebrow, the "paid later" fee heading, the tuition
card (one card, not two), the shared pay-after-placement questions, and the
three sections that promise placement — the roadmap ending in "Get hired", the
"first class to first offer" services list, and the hiring network. The nav
dropdown and the footer split into "Pay After Placement" and "Bootcamps",
because both headings otherwise make the claim one click early. Nothing
renders differently until a programme is ticked.

**One behaviour worth knowing:** blank fee fields normally fall back to the
standard figures from Settings. For an upfront programme they do not — the
standard figures are PAP figures, and a blank field filling itself in put a
struck-through ₹90,000 and an EMI plan beside ₹4,999.

**What is left is content, and it is MOP's.** The programme does not exist yet:
create it at *Admin > Website > Programs > New*. The hero headline, intro and
highlights are database copy — **the existing Python Full Stack page's copy
says "paying after you are placed", so do not clone it.** Nothing in the code
will add the interview-then-PAP route to the page, and nothing will stop
someone typing it in either.

Note the existing `/programs/python-full-stack` stays as it is — a PAP
programme. The bootcamp is a separate programme with its own slug.

### 13. The programme page is not a timetable (8 Sep 2026)

Two more Pay After Placement claims were found on the programme page, both
missed when the other five were gated for the bootcamp work. Found because the
user sent a screenshot of the syllabus section for an unrelated reason.

- The syllabus lede read *"Each phase ends at a point where you are genuinely
  employable — and the calibre of employer rises as you go."* Hardcoded. An
  upfront-fee programme now reads *"What you learn, week by week."*
- Each phase can carry a **Placements exit** block naming the calibre of
  employer a learner is ready for. It is the strongest placement claim on the
  site, and it is now **not rendered at all** on an upfront-fee programme —
  guarded in code rather than trusted to be left blank, because "leave that
  field empty" is an instruction somebody eventually forgets. Verified against
  a programme carrying exit data on all four phases: zero blocks rendered.

That makes **seven** things `detail.fees.upfrontOnly` turns off, not five.

Also decided: a programme's syllabus sections are named for what they cover
(*Python Foundations*, *Databases & SQL*) rather than by week or day number,
and their Body is left empty so a section is a name and its topic list. The
user supplied a reference for this shape.

### 12. From Bala's website review (7 Sep 2026)

He sent a review, run through some AI tool, scoring the live site 6/10. Two of
its four "bugs" were one real defect in `CountUp.jsx`, now fixed (see
HISTORY.md). The rest of what it raised, sorted into what is true:

**True and still open:**

- ~~**Nine placeholder mentors are live**~~ **Fixed in code, 7 Sep** — see
  thread 2. Two real-but-unverified mentors still need unticking by hand.
- **No analytics anywhere.** No gtag, GTM, Plausible or PostHog on the live
  page, so nothing counts a callback request or a WhatsApp click. Nobody can
  say whether the site converts.
- **No spam protection on the enquiry form** — no honeypot, no captcha, no
  rate limit on `POST /public/enquiries`. It has not been abused yet; a public
  form on an indexed domain eventually is.
- ~~**`og:image` is `apple-touch-icon.png`**~~ **Fixed 7 Sep.** A real
  1200x630 card at `frontend/public/og-card.png`, regenerated by
  `scripts/make-og-image.py` (needs Pillow and Windows system fonts).
  `twitter:card` is now `summary_large_image`, and `useSeo` re-asserts both
  on every route.
- ~~**No spam protection on the enquiry form**~~ **Partly wrong when written.**
  Both public POSTs were already throttled at 5/IP/hour. What was missing was
  a honeypot, added 7 Sep: an off-screen `company_website` field on both
  forms, checked in `_is_bot()`. A filled honeypot gets the same 201 and the
  same wording as a real submission, from one shared response object, and the
  row is never written.

**Already done, and the review did not check:** per-page titles and
descriptions, Open Graph tags, canonicals, `sitemap.xml` (15 URLs) and
`robots.txt`; the three legal pages; email delivery verified end to end.

**Audited 7 Sep against the rest of the review's list, so nobody re-checks:**

| Its item | Measured |
|---|---|
| Mobile responsiveness | No horizontal scroll at 375px. The only wide elements are inside the clipped ticker. |
| Alt text | 0 images missing it (there are only 2, both the logo). |
| Form labels | 5 inputs, 0 unlabelled. `lang="en"` set, one `h1`. |
| Tap targets | 19 below the WCAG 2.2 AA floor of 24x24 — mostly arrow links and social icons. |
| Heading order | One skip, `h2 -> h4`. |
| Performance | DOMContentLoaded 242ms, 13 requests, no images to compress or lazy-load. |
| Bundle | **655KB JS (175KB gzipped) in one chunk** — the only real performance lever, and it is code splitting, not images. |
| Schema markup | **Was zero. Added 7 Sep** — see below. |
| Contrast | A naive script flagged 11 distinct styles, but it cannot resolve gradient backgrounds and most look like false positives. **Needs a real tool (axe/Lighthouse) before anyone acts on it.** |

**Structured data, added 7 Sep.** `EducationalOrganization` static in
`index.html` (so a crawler that never runs the JS still gets it), plus
`Course` and `BreadcrumbList` injected per programme page by `useSeo`. The
per-page block is removed on unmount — without that, browsing three
programmes would leave Google three contradictory Course blocks on one URL.
`offers` and `hasCourseInstance` are deliberately omitted: Google reads them
as a price and a scheduled sitting, and the catalogue has neither. `sameAs`
is omitted until MOP supplies the social URLs — it is one of the stronger
signals for tying a new domain to a known brand, which is exactly the .com's
problem against the .in and .co.in.

**Wrong, and worth not acting on:**

- *"A placement rate cannot exceed 100% — use a believable number e.g. 92%."*
  The stored figure is **87%**. The 303% was the counter bug. Taking that
  advice would replace a real number with an invented one.
- *"Your stats look inflated — ₹165L package, 1,741 hiring partners."* Both
  were the bug's output. The stored figures are ₹47.6L and 500+. The
  underlying caution still stands for the reason in thread 2 — these are
  MOP's own published claims and nobody has checked them against records —
  but not for the numbers it cited.
