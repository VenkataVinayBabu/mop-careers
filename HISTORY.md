# MOP Careers — build history

The detailed record of how the platform got here: what was built in each phase,
the decisions worth remembering, and the bugs worth not repeating.

Split out of CLAUDE.md because that file is loaded into every session and this
history is not needed for ordinary work. **CLAUDE.md remains the spec, the
working agreement and the live to-do list** — start there. Come here when you
need to know *why* something is the way it is.

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

  **Still single-programme internally, and deliberately so** at the time: a global
  55 days and the Python day 1-11 topics seeded into every new batch whatever it
  taught. **Fixed later** — see "Per-programme curriculum templates" at the end of
  this log.

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
    **The user holds the current production admin password** (set through
    Render). It is not a blocker and does not need recovering — do not raise
    it as one. Note this also means forgot-password has never had to work in
    production, which is a separate problem while SMTP is unconfigured.

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

  **A deploy-checking trap that cost half an hour.** Polling
  `https://mop-careers.onrender.com/` for a changed bundle hash reported "not
  deployed yet" long after both services were live. Cloudflare edge-caches
  `index.html` with `s-maxage=300`, so a plain GET happily served the *previous*
  build's HTML — naming the previous bundle — for five minutes at a time, and a
  poll every 20s just kept hitting the same cached copy. **Always cache-bust
  when checking a deploy**: a unique query string plus `Cache-Control: no-cache`
  (`cf-cache-status: MISS` in the response headers confirms you got past it).
  This sits on top of the existing rule that a changed *hash* is the signal, not
  a string match.

  **`View the site` needed `?preview`.** `PublicHome` redirects any signed-in
  user to their own dashboard, so the button on Admin > Website opened a tab
  that bounced straight back to `/admin` — the one person who needs to check
  their own edit was the one person who could not. `/?preview` opts out of the
  redirect. It has to be explicit: a signed-in student landing on `/` should
  still go to their dashboard, not the marketing page.

  A verification note: **do not `resize_window` the automated pane wider than
  it really is.** Emulating 1280 on a ~540px pane left the layout stretched but
  the paint clipped, so screenshots showed a stale frame and coordinate clicks
  landed nowhere. At native width everything worked. Even then the pane's
  synthetic clicks and key presses land only intermittently — pressing Enter in
  a focused field submitted the form when six clicks on the button did not.

- **The mentors section is a horizontal rail, not a grid ✅.** Thirteen mentors
  in a four-up grid was four rows of near-identical cards — the tallest section
  on the page for the least said, with the fold landing in the middle of it.
  It now scrolls sideways and stays one card high however many mentors there
  are, which matters because that count is about to become editable.
  - `.rail` and `.rail-bleed` in `index.css` are the reusable pattern.
    `ProgramDetail` already hand-rolls the same thing for programmes with more
    than four mentors; worth folding into these utilities next time it is
    touched.
  - **The scrollbar is hidden, so the affordances have to be real.** Arrow
    buttons on `lg` and up (hidden on touch, where a thumb needs no buttons),
    snap points, and `tabIndex={0}` + `role="region"` + `aria-labelledby` so a
    keyboard user can reach and scroll it. A hidden scrollbar with no focusable
    child would otherwise strand anyone not using a mouse.
  - **`scroll-padding-left` must match the bleed padding.** With
    `snap-mandatory` and `px-6`, a `snap-start` card aligns to the raw
    scrollport edge, so the rail snapped to 24px and could never come to rest
    at `scrollLeft: 0` — leaving the Previous arrow enabled while already on
    the first card. `scroll-pl-6` fixes it. Found by measuring, not by looking.

  **Verifying a scroller in the automated pane needs a workaround.** Both
  `scrollBy({behavior:'smooth'})` and the browser's own `scroll` event delivery
  are driven by frames, and the pane frequently does not composite — so the
  arrows appeared to do nothing and the disabled states never updated. Neither
  was a bug. Set `scrollLeft` directly and `dispatchEvent(new Event('scroll'))`
  to exercise the listener, and read the resulting state in a **separate**
  tool call, because React batches the update and a same-block read returns the
  previous render.

- **Admin content management, part 2 — mentors ✅.** `Admin > Website > Mentors`
  adds, edits, hides, reorders and deletes the people on the public site.
  Deleting one of the nine fabricated mentors is now about a minute's work
  instead of a developer and a git push. 1 new table (`mentors`), 16 tables
  total, 5 migrations.
  - **The table ships SEEDED with the thirteen mentors that were hardcoded**,
    and that is the whole design. Site settings could start empty because a
    missing row means "use the default". Mentors cannot: with an empty table
    there is no way to tell "nobody has set this up" from "the admin deleted
    them all", so deleting the last mentor would quietly resurrect the
    hardcoded list. Seeded, the database is the source of truth from the first
    deploy and **an empty list is a real answer**.
  - `MENTORS` in `site.js` is now only the first paint — what shows before the
    API answers, and all there is if the backend is asleep. Editing it does not
    change the site. Components read `useMentors()`.
  - Note the `??` rather than `||` where the mentors store reads its cache: an
    empty array is a legitimate cached answer and must not fall through to the
    defaults.
  - The mentors section, and its nav entry, **disappear entirely when there are
    none** rather than leaving a heading and two arrows over empty space.

  Decisions worth remembering:
  - **`programs` is a JSON array of slugs, not a join table.** The programme
    catalogue is still frontend data in `programs.js`, so there is nothing to
    point a foreign key at. Same reasoning as `Enquiry.programme`. Revisit when
    courses become a table.
  - **Reorder sends the whole list of ids, not "move this one up".** One
    request cannot leave the table half-sorted, and two admins reordering at
    once end with one of the two orders rather than an interleaving. Unknown
    ids are ignored rather than rejected — an admin reordering while someone
    else deletes a row should still get their order applied.
  - **`sort_order` steps by 10**, leaving room to slot a mentor between two
    others later without renumbering the table.
  - **The admin list deliberately does not filter by `published`.** Only the
    public endpoint filters; an unpublished mentor still has to be editable.
  - **Photos are a URL field, not an upload.** Uploads still wait on the
    object-storage decision, but a link to an image MOP already hosts works
    today and costs nothing.
  - **The migration carries its own copy of the seed data** rather than
    importing the models or reading `site.js`. A migration has to keep doing
    the same thing years from now, and both of those will have moved on.
  - `Admin > Website` is now a **tabbed shell** (`WebsiteTabs`), which is where
    Stories and Companies go next.

  Verification: **50/50 API assertions passed** — RBAC across anonymous,
  teacher and student on read, create, delete and reorder; the seeded shape
  (13 rows, 4 real, 9 flagged); four rejected payloads; trimming and
  slug deduplication on create; partial update leaving untouched fields alone;
  404 on a missing id; the published filter hiding a mentor from the public
  list while keeping it in the admin one; reorder including a stale id and an
  incomplete id list; and delete being idempotent-by-404. In the browser, every
  write path driven for real: delete (confirm names the person, counts and the
  warning banner update), hide (badge, dimming, button flip, count), add
  through the modal including a 422 rendering under the photo field, reorder
  with the ends disabling correctly — then the public rail showing exactly 12
  cards with the right one added, one deleted and one hidden, and the new
  mentor appearing on the programme page she was assigned to. Clean console,
  one fetch per endpoint despite StrictMode, and **the whole site still renders
  with the backend stopped and the cache cleared**.

- **Admin content management, part 3 — stories and hiring partners ✅.** That
  completes everything on the marketing site except courses. 2 new tables
  (`stories`, `hiring_partners`), 18 tables total, 6 migrations. Both seeded
  from `site.js` for the same reason mentors were.
  - **`hiring_partners` merges two hardcoded lists into one.** `COMPANIES` was
    the hiring-network grid and `PLACEMENTS_TICKER` was company-plus-package;
    they overlapped in ten of twelve entries. One row now: published means it
    is in the grid, and a `package_lpa` on top of that puts it in the ticker
    as well. Two lists that had to agree became one that cannot disagree.
  - **`HiringPartner` is deliberately not the Phase 2 `Company`.** That one is
    an employer a student actually applied to, joined to applications and
    offers. This one is marketing copy. Sharing a table would tie the public
    site to the placement records.
  - **The story quote is capped at 200 characters at the input**, with a
    counter that turns orange near the limit — the constraint decided during
    the layout work, finally enforced. A longer quote does not break anything,
    it drags the card row taller and hollows out the cards beside it.
    Truncating at render was rejected: silently clipping what someone said
    looks like a broken site to whoever wrote it.
  - Both screens carry a plain-language warning about the claim they publish:
    stories need written consent, and a package figure says a named company
    paid a MOP learner that salary.

  Two refactors this made worth doing, both because a third copy is where
  copy-paste stops being cheaper:
  - **`app/website_content.py`** holds the ordering, 404, append and reorder
    logic all three entities share. The endpoints stay written out — a generic
    CRUD generator would hide the one thing a reader needs to see.
  - **`useContentList` + `ReorderButtons`** on the frontend do the same for
    load/create/update/delete/reorder. The row markup and the form stay in each
    screen, because that is the part that actually differs. Mentors was
    refactored onto both.

  Verification: **52/52 API assertions passed** (157 across the three suites,
  all re-run green together) — RBAC on both entities, the seed shape including
  Cred arriving from the ticker-only list and TCS arriving with no package,
  a 201-character quote rejected and exactly 200 accepted, trimming, the
  published filter, reorder, 404s, and a check that the Phase 2 companies
  endpoint still works and is a separate list. In the browser: the tab strip,
  the quote counter warning at 195/200, adding a story, and clearing Cred's
  package — which moved the subtitle from 8 to 7 in the ticker while leaving
  it in the grid, then showed exactly that on the public site.

  **A bug this introduced and caught.** `COMPANIES` was an array of strings and
  `partners` is an array of objects; `ProgramDetail` still rendered `{c}`,
  which crashed every programme page with "Objects are not valid as a React
  child". The landing page was fine because it was updated in the same edit —
  the programme page was a second consumer of the same constant. **When a
  shared data shape changes, grep for every consumer**, and check a page that
  is not the one being worked on.

- **Admin content management, part 4 — programmes ✅. The thread is done.**
  Every piece of the marketing site is now editable at `Admin > Website`.
  1 new table (`programs`), 19 tables total, 7 migrations.
  - **Seven of the eight syllabi were written in-session, and correcting one
    was the single largest thing on the to-do list that still needed a
    developer.** It is now a form: phase titles, topics, the Placements Exit
    company lists, salary bands, projects and FAQs.
  - `Admin > Website > Programs` lists the catalogue; **one programme is a
    whole page** (`/admin/website/programs/:id`), not a modal, because it
    carries eight sections and a four-phase syllabus.
  - The list flags the two **unconfirmed** programmes (Cloud Computing, Cyber
    Security) with a banner saying nobody has confirmed MOP runs them.

  **The storage decision, which is the one worth arguing about.** CLAUDE.md
  said courses "need real tables". They got *one* real table: typed columns
  for what is filtered, sorted or looked up by (`slug`, `published`,
  `featured`, `category`, `sort_order`) and a single JSON `detail` document
  for everything the programme page renders.
  - Normalising `detail` into phase/project/role/faq tables would mean four
    more tables, four more sets of CRUD and four more ordering columns, to
    gain integrity over content that is **only ever written as a whole page
    and only ever read as a whole page**. Nothing joins to a syllabus phase.
  - `detail` is still **typed at the API** (`ProgramDetail` and friends in
    `schemas.py`) — storing a document does not mean accepting any shape, and
    those models are the only readable description of what a programme page
    can contain.
  - Sending `detail` on an update **replaces it wholesale**. Merging half a
    syllabus into another is not something anyone means to do.

  Decisions worth remembering:
  - **The whole published catalogue is one request** (~40KB for eight). A
    programme page therefore needs no fetch of its own and has no loading
    state — cheaper than a second round trip to a backend that may be waking.
  - **The slug is derived from the name when left blank**, and a duplicate is
    a **409 with the clashing programme named**, not a 500 from the database
    constraint. Changing a slug breaks existing links, so the form says so.
  - **`confirmed` is admin-facing only.** The public site never reads it —
    `published` is what hides a programme. It exists to mark "nobody has
    checked this" without taking the page down.
  - `TagList` commits on **blur as well as Enter**, or anything typed and not
    confirmed is silently dropped when the programme is saved.
  - **Tailwind class names cannot be interpolated.** `text-${tone}` produces a
    class that was never generated and silently does nothing; the two tones
    are written out. Same trap as the missing navy-500 ramp.

  Verification: **51/51 API assertions** (208 across the four suites, re-run
  green together) — RBAC, the seeded eight with the right two featured and the
  right two unconfirmed, whole `detail` blocks round-tripping unchanged,
  detail replacing rather than merging, slug derivation, 409 on a duplicate
  slug both on create and on rename, five rejected payloads including a
  malformed FAQ pair and a phase with no title, the published filter, reorder
  with a stale id, and 404s. In the browser: the editor loading all eight
  sections of a real programme (4 phases, 4 roles, 6 reasons, 4 projects, 2
  questions, 116 tag chips), a phase renamed and a topic added, saved, and the
  correction appearing on the public page — then **all eight programme pages
  walked** to confirm each still renders.

  **Fees were the gap in "everything is editable", and they are now closed.**
  Two things were wrong. The standard fee structure lived in `DEFAULT_FEES` in
  `site.js` — global, hardcoded, identical on all eight pages. And the
  per-programme escape hatch documented here (`detail.fees`) had been **broken
  by the typed detail schema**: `ProgramDetail` had no `fees` field, so
  Pydantic silently dropped any override sent to it. The API answered 200 and
  the block vanished. Nothing was lost, because no programme had one — but the
  escape hatch was dead.
  - The seven fee fields are now site settings, edited on **Website >
    Settings**, and every programme page falls back to them.
  - A programme overrides them from its own editor, behind a tick-box that
    prefills from the standard figures so only the difference gets typed.
  - The merge is **per field, not all-or-nothing**: overriding the tuition
    alone keeps the standard registration note rather than blanking it. Blank
    override fields fall through too.
  - `DEFAULT_FEES` is now literally `SITE_DEFAULTS.fees`, not a copy — two
    lists of prices that can drift apart is the bug worth not having.

  **A bug this introduced, found by walking those pages.** Renaming
  `LIVE_PROGRAMS.map(` to `programs.map(` hit `PublicFooter` as well as
  `PublicHeader`, and the footer is a separate component with no `programs` in
  scope. Every programme page threw `ReferenceError: programs is not defined`.
  **The build passed** — a ReferenceError is not a compile error — which is
  exactly why "it builds" is not verification. Same shape as the `COMPANIES`
  bug: a second consumer inside the file being edited.

- **Admin content management, part 5 — the headline statistics ✅.** The four
  figures under the hero and the four in the outcomes grid. 1 new table
  (`statistics`), 20 tables total, 8 migrations. **Nothing on the marketing
  site is hardcoded any more.**
  - **One table, split by `section`.** They were two arrays agreeing on three
    of their four numbers — two places to remember when a figure changes, the
    same trap the hiring partners were in.
  - **`decimals` is derived from the value, not stored.** 47.6 needs one
    decimal place and 1050 needs none; a separate "decimal places" box that
    has to be kept in step with the number is the one mistake nobody would
    spot. The frontend mapper works it out.
  - The screen shows a **live preview** of what a visitor will see — "1,050+",
    "₹47.6L" — because a raw value and a suffix in two boxes read very
    differently from the assembled result.
  - It carries the bluntest warning of any of these screens: these are the
    least verified claims on the site, and a placement rate is the first thing
    a sceptical parent asks you to back up.

  Verification: **23/23 API assertions** — RBAC, the seeded eight split four
  and four, an unknown section and a negative figure rejected, trimming, the
  published filter, moving a figure between sections, and delete naming the
  label rather than a `name` field it does not have. In the browser: both
  sections listed with their previews rendering exactly as the public page
  does, and an edit to the placement rate reaching the public store.

  **What could not be checked in the automated pane:** the counters animate on
  IntersectionObserver, which never fires without compositing, so they sit at
  zero there. The structure was verified instead — labels, the rupee prefix
  and coloured suffix in their own spans, and the decimal place correctly
  derived. The animation itself was verified when `CountUp` was built.

- **Per-programme curriculum templates ✅ — thread 6 is closed.** A batch is
  built from its programme's own day-by-day plan and day count. **A Java batch
  created today gets 45 Java days, not 55 Python ones.** 1 new migration, no
  new tables (20 total, 9 migrations).
  - `programs` gained `total_days` and `curriculum`; `batches` gained
    `program_id`. `TOTAL_CURRICULUM_DAYS` is gone.
  - **The template lives on the programme rather than in a second `Course`
    table.** CLAUDE.md called for a `Course` entity, but the marketing
    catalogue *is* MOP's course list — a separate one would be two lists that
    have to agree, which is the trap the hiring partners and the statistics
    were both in. Admin > Batches picks from the same eight programmes the
    public site lists.
  - **It is two columns, not keys inside `detail`.** The website editor
    replaces `detail` wholesale, so a syllabus a live batch is taught from
    would be one careless marketing edit away from being wiped.
  - **The public payload does not carry it.** `ProgramOut` is unchanged and
    `ProgramAdminOut` adds the two fields, so the ~40KB catalogue every visitor
    downloads does not grow an internal training plan. `applyPrograms()` strips
    both before anything reaches the public store's localStorage cache.
  - **A batch's length is derived, never stored** — it is the number of
    `curriculum_days` rows the batch has, the same reasoning as the fee balance.
    That is what lets a 55-day legacy batch and a 45-day new one coexist with
    nothing having to remember which is which. `batch_total_days()` is the one
    way to ask.
  - **Days are materialised once, at creation.** Editing a template changes
    what the *next* batch starts from; a running batch keeps its days, dates,
    recordings and attendance. Moving a batch to another programme re-labels it
    and nothing else. `ensure_curriculum` only ever adds days — shortening a
    batch would delete rows that may carry attendance.
  - **`midpoint_day28` keeps its column name and lost its meaning.** The
    halfway day is now `(total_days + 1) // 2` — 23 on a 45-day batch, and
    still exactly 28 on a 55-day one. Renaming the column is a migration for no
    behavioural gain.
  - **`total_days` seeds to 45 for all eight**, which is what MOP publishes
    ("45-day course + 45-day internship") and what the user stated. Only Python
    Full Stack gets a template with real topics — days 1-11 from the brief, the
    only day-by-day curriculum MOP has supplied. **The other seven are
    deliberately empty**, so their batches get correctly-counted placeholder
    days rather than somebody else's syllabus. Filling them in is a form at
    Website > Programs, not a developer.
  - A batch can still be created by typing a course name, which is matched
    against the programme list — so "Python Full Stack" still gets the Python
    outline — and falls back to 45 blank days when nothing matches.
  - `DoubtCreate.related_day` was capped at 55. A programme can now be longer,
    so it is bounded at 365 for sanity rather than to a course length.

  **A bug this found, and the general lesson.** A topic of nothing but spaces
  was **accepted, written to the database, and then 500'd on the way back out**.
  `Field(min_length=1)` with a plain `@field_validator` runs the constraint
  *before* the validator, so "   " passed min_length, trimmed to "", saved, and
  failed against the response model. `mode="before"` on the trim is the fix.
  **Any `min_length` field with an "after" trim validator has the same
  shape** — several exist in `schemas.py` (`ProgramCreate.name` among them);
  they do not 500 because nothing re-validates them on the way out, but they
  will happily store a value shorter than the minimum.

  Verification: **68/68 API assertions** — RBAC across anonymous, teacher and
  student; the public/admin payload split; the seeded eight at 45 days with
  Python's 11 and Java's none; a Java batch whose day 1 is *not* Python's; a
  Python batch keeping days 1-11 and a placeholder day 12; creation by name,
  by unmatched name, and a 404 for a missing programme; the seeded 55-day batch
  untouched and linked by the migration; seven rejected payloads including a
  day past the end, a duplicate day, day 0 and the whitespace topic that caused
  the bug above, each confirmed to have written nothing; wholesale replacement;
  raising the length and planning a day past the old one in one request; the
  teacher summary, the student dashboard and the progress report all reporting
  45; and the midpoint milestone stamping on day 23 rather than day 28. The
  migration was applied, rolled back and re-applied. In the browser: the
  programme picker with its live "creates 45 class days, the first 11 already
  filled in" hint, a Java batch created through the real form showing 45
  placeholder days in the teacher workspace, the curriculum editor's overrun
  warning and the server's matching 422 both rendering, a topic typed in the
  form appearing as day 1 of a batch created afterwards, and the public
  programme page and its localStorage cache carrying neither field.

- **The viewer role ✅ — the first of the three extra roles is built.** A
  non-technical viewer who watches every batch and rings whoever has not
  uploaded. **No migration**: `users.role` is a `String(20)` rather than a
  native enum, exactly so a new role costs nothing — that decision, made in
  Phase 1, paid off here.
  - **The screen that matters is `/watch`, a worklist, not a dashboard.** The
    brief was "if not uploaded the viewer will call the teacher", so the home
    screen is every outstanding item, oldest first, each already carrying the
    teacher's phone number as a `tel:` link. A read-only copy of the teacher
    workspace would have made them hunt for the same information.
  - **Three kinds of follow-up**, and the first is the one a naive build
    misses: `not_taught` (dated in the past, still not marked complete),
    `no_recording` and `no_notes`. An **undated** class is never overdue — a
    batch that has not scheduled day 40 yet is not behind on it, and reporting
    it would bury the real ones.
  - **A viewer is deliberately not `require_staff`.** That guard sits on the
    teacher router, which marks days complete, uploads notes and takes
    attendance; adding a read-only role to it would have handed over every one
    of those writes in one line. Viewers get their own router with
    `dependencies=[Depends(require_viewer)]` — the same router-level lock fees
    uses, for the mirror-image reason: fees locks a router nobody may read,
    this one locks a router that must never gain a write.
  - **Admins can open `/watch` too**, so there is no need for a second account
    to see what a viewer sees.
  - **Teachers' contact details are in; students' are not.** A viewer
    chases teachers, so that is the data the job needs. Students appear as a
    name and an attendance figure, which is what "how many are there and who
    are they" asks for. Being internal staff makes names fine; it does not make
    every field fine.
  - **A viewer cannot be put in a batch** — the API refuses it (400) rather
    than ignoring it, because an admin who picked a batch expected it to mean
    something.
  - **The role is called Viewer everywhere** — sidebar, Accounts tab, account
    creation copy, database and docs. It was briefly relabelled "Coordinator"
    on the grounds that it read better as a job title; the user asked for it
    back, because Viewer is the name in the spec and the name they use. **The
    user's vocabulary wins over a nicer-sounding one.**

  Verification: **63/63 API assertions**, and 24 of them are denials — a
  read-only role that can read everything is one forgotten guard from being an
  admin, so the suite asserts 403 on fees, placements, accounts, batches,
  enquiries, stats, all of website, every teacher route and the student
  dashboard, plus nine write attempts. It also asserts **structurally** that
  every path under `/viewer` in the OpenAPI schema is a GET, which catches a
  future write endpoint added to that router. Then: the seeded shape, follow-up
  detection of all three kinds against real data, the filter, the overview
  totals agreeing with the list, a 404 for a missing batch, and a blocked
  viewer being turned away on an already-issued token. Re-run green alongside
  the 68 curriculum assertions. In the browser: signing in as a viewer
  landing on the worklist with the right four items and Ravi Kumar's number on
  every row, the filter narrowing to 2, the class-day table showing
  Missing/Missing for a class with nothing uploaded and an Open link where the
  recording exists, dashes rather than false alarms on an untaught day, the
  roster with attendance and no email addresses anywhere on the page, a
  viewer typing `/admin/fees` being bounced to `/watch`, and the admin's
  Viewers tab with its plain-language explanation of the role. Clean
  console on a fresh load.

- **The chase log ✅ — the follow-up trail closes itself.** The user asked
  whether a viewer can mark an item done once the teacher uploads. The
  answer was "the item already removes itself", demonstrated end to end; what
  they actually wanted was the **record**: which dates they followed up, which
  date the teacher delivered, closing automatically on delivery. 1 new table
  (`class_chases`), 3 new columns, 21 tables total, 10 migrations.
  - **"Mark as done" was refused, deliberately, and this is the decision to
    keep.** A manual tick would let a viewer clear an item while the
    recording was still missing, so the screen would say "all clear" while a
    student had nothing to watch. The list is computed from whether the file is
    actually there; its entire value is that it cannot be wrong. Chasing
    therefore **records a phone call and resolves nothing** — the item stays
    and gains "chased twice, still nothing", which is more useful than either a
    tick or silence.
  - **The viewer is no longer strictly read-only, and that was a conscious
    reversal.** It was built and verified as GET-only. Logging "I rang Ravi on
    the 5th" is the viewer's own note about their own call: it touches no
    class record, no student, no teacher, and cannot hide a follow-up. The
    structural assertion was **changed rather than dropped** — the suites now
    assert the only non-GET under `/viewer` is `POST /days/{id}/chase`, so a
    second write still cannot appear unnoticed.
  - **Nothing recorded when a teacher delivered**, so
    `taught_marked_at`, `recording_uploaded_at` and `notes_uploaded_at` were
    added to `curriculum_days`. Stamped **on the transition**, not on every
    save: re-saving a day that already has a recording does not restamp it and
    make an old upload look like today's work. Clearing a recording or deleting
    the notes clears the date with it, because it is no longer true.
  - **Existing rows get NULL, and the UI says "date not recorded".** Every
    upload that happened before these columns existed has no date, and
    backfilling one from `created_at` would look like data and be fiction.
  - **A chase attaches to a class day, not to a missing item.** One phone call
    covers "day 9 has neither the recording nor the notes", so both outstanding
    rows for that day show the same trail.
  - Chases are **appended, never edited** — "we have asked three times" is the
    useful fact.
  - `chased_by_name` is stored alongside the user FK, which is `SET NULL`:
    deleting the viewer must not delete the record that the call happened,
    and an audit line naming nobody is not much of an audit line.

  **A bug the suite caught.** `closed_at` originally required all three
  timestamps, so any class marked taught before the migration — every existing
  one — would have shown no close date forever, even with both uploads dated.
  It now takes the last of the stamps that exist, and the three individual
  dates are on the payload anyway, each admitting to itself when it is unknown.

  Verification: **42/42 API assertions**, re-run green with the other two
  suites (**173 together**). The load-bearing ones: chasing leaves the item
  outstanding on both counts, does not reduce the overview total, and cannot
  alter the class record; chases accumulate in order; the recording clears one
  kind and not the other; the day leaves the list entirely when the notes
  arrive; the trail then carries all three calls and both delivery dates;
  editing a topic does not restamp anything; clearing a recording clears its
  date and brings the follow-up back; and a day nobody chased never appears in
  the closed list. In the browser: logging a call from the day 9 row with a
  note, both day 9 rows then reading "Chased once · last today — still not
  uploaded" with the count still at 4, the teacher uploading, the count
  dropping to 2, and the Closed tab showing "rang 11 Aug 8:16pm — recording and
  notes 11 Aug 8:16pm" with "Marked taught — date not recorded" for the half
  that predates the columns. Clean console on a full reload.

- **Contributor and member ✅ — all six roles now exist.** A contributor edits
  the public site and publishes nothing; a member approves or sends it back
  with feedback. 1 new table (`website_changes`), 22 tables total, 10
  migrations. **No role migration** — `users.role` is a `String(20)`, which is
  the third time that Phase 1 decision has paid for itself.
  - **Approval is blocking, which was the expensive of the two options** in
    thread 4 and the one recorded as "does not fit in a week". The user chose
    it explicitly.
  - **Approval covers the public website only.** Onboarding, the class
    schedule, curriculum and placement records apply immediately. The reason
    for the queue was that the website must not change without review; that
    reasoning does not extend to setting a class date, and a curriculum edit
    waiting on approval would make the role useless for daily work. Stated as
    an assumption when built.
  - **One table describes any change**: entity, entity_id, action, and the
    proposed values as JSON. That is what lets creates, deletes and reordering
    queue alongside edits. The alternative — shadow `draft_*` columns on every
    content table — doubles every column and still cannot express "create this
    row".
  - **`website_apply.apply` is the only place a website change is applied**,
    used by both an admin's direct save and a member's approval. Two
    implementations would drift, and the difference would only ever surface as
    "it worked when Bala did it".
  - **`require_publisher` is what makes "a contributor cannot publish" true**
    rather than conventional: the direct endpoints refuse them with a message
    pointing at the queue. The router guard widened to `require_website_editor`
    so they can still *read* what they are editing.
  - **Rejection requires a reason** (422 without one). "Rejected" with no
    explanation is what makes an approval queue hated — the contributor cannot
    act on it, so they resubmit the same thing.
  - **A contributor's screens keep showing the live values**, with a standing
    notice in the tab strip saying so and a count of what is waiting. Anything
    else and they would save, see no change, and reasonably conclude it failed.
    Reordering is deliberately *not* applied locally either, or they would be
    looking at an arrangement no visitor has.
  - **`ROLE_MANAGES` says which accounts each role may create, edit, block
    *and see*, and it is the single rule.** Admin manages everyone below;
    a member manages contributors, viewers, teachers and students; a
    contributor manages teachers and students. **Nobody manages their own
    role** — a member creating a member would be minting their own peer, the
    same objection as a contributor creating their own approver.
    - The user found this twice, both times by looking at a screen: first a
      "New member" button on their own Members tab, then the Members list
      itself. The first fix only stopped *contributors* creating members,
      which was half the rule; the second exposed that `GET /admin/users`
      still returned everybody, because it was written when only an admin
      could open that screen.
    - **Seeing and acting are deliberately the same set**, which is why this is
      a map rather than a numeric ladder. A rank comparison would have let a
      contributor *see* viewers while being unable to create one — a list you
      cannot touch invites exactly the question "why am I shown this?".
    - So a member has no Members tab, a contributor sees only Students and
      Teachers, and the account list comes back already filtered. The screen
      mirrors the map so the tab does not exist; the API is what enforces it.
  - `assert_batch_access` now lets contributors and members reach every batch:
    both are organisation-wide roles, and only a teacher is batch-scoped.

  Two bugs found by the suites, both the kind that only show up under a real
  login:
  - `Role` in `schemas.py` never learned the new values. `UserCreate` accepted
    `contributor`, but **logging in as one returned 500**, because `UserOut`
    still declared four roles.
  - Validating a proposal happens *inside* a handler, and a raw Pydantic
    `ValidationError` there is not converted by FastAPI — so a contributor
    typing a two-letter name got "Internal Server Error" instead of a field
    message. Re-raised in FastAPI's own shape so the form highlights the field.

  **A bug the user found by clicking Doubts, and the hole behind it.**
  `doubts.py` guards itself **inline** rather than through `require_staff`, so
  widening that dependency never reached it: a member had a Doubts entry in
  their sidebar and a 403 behind it. Worse, the inline check was
  `elif user.role != ROLE_ADMIN` on the read and "anyone who is not a student"
  on the write — which meant the *viewer* could mark a doubt answered, a
  role documented and verified as writing nothing anywhere. Correct while only
  admin and teacher existed; silently wrong the moment a fourth role did. Both
  are now an explicit `INBOX_ROLES` allowlist. **The lesson: a widened
  dependency only reaches the files that actually use it — grep for hand-rolled
  role checks whenever the role set changes.**

  Verification: **49 assertions on the workflow and 47 on the permission
  matrix**, re-run green with the earlier three (**264 together**). The
  load-bearing one is asserted directly rather than inferred: after a
  contributor saves, both the admin list *and* the public payload are
  unchanged, and only after approval do they move. Also: a contributor refused
  on every direct write path, on fees, enquiries, milestones, stats, account
  edits and batch creation; unable to see another contributor's proposal or
  open it by id; unable to approve their own; rejection leaving the live row
  untouched; withdraw; create and delete queuing; and settings queuing. In the
  browser, the whole loop end to end across two real logins: contributor hides
  a mentor → row does not move, "1 waiting" → member's queue shows it with a
  badge → sent back with a note → contributor sees "Sent back" and the feedback
  on their own screen. Clean console in a fresh tab.

---
