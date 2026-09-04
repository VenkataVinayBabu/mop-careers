# Deploying MOP Careers to AWS

Written for someone who has not used AWS before. Do the stages **in order** —
each one is useful on its own, and each is reversible until the next begins.

Bala's decision, 15 Aug 2026: AWS. This supersedes [DEPLOY_AZURE.md](DEPLOY_AZURE.md),
which is kept only because the sequencing argument in it still applies.

> **Never paste a password, an AWS access key or a database connection string
> into a chat, a ticket, a commit or a screenshot.** Type them straight into the
> console or the service's own settings screen.

---

## The four things you are creating

| Piece of the app | AWS service | Why |
|---|---|---|
| PostgreSQL database | **RDS for PostgreSQL** | Free 12 months on a new account |
| FastAPI backend | **App Runner** | You push code; it builds and runs it |
| React frontend | **Amplify Hosting** | GitHub-linked, free SSL and custom domain |
| Notes PDFs, photos | **S3** | Files that survive a deploy |

Nothing else. Ignore the other 200 services.

---

## Stage 0 — Secure the account (30 minutes, do this first)

An AWS account with no protection is a genuine financial risk: there is **no
spending cap by default**, and a leaked root credential can run up thousands.

1. **Turn on MFA for the root user.**
   Sign in → click your account name (top right) → *Security credentials* →
   *Multi-factor authentication (MFA)* → *Assign MFA device* → use an
   authenticator app on your phone.

2. **Set a billing alarm.**
   Search "Billing" → *Billing preferences* → tick *Receive AWS Free Tier
   alerts* and enter an email. Then *CloudWatch* → *Alarms* → *Create alarm* →
   metric *Billing → Total Estimated Charge* → threshold **40 USD** → notify
   your email.

   This will not stop spending; it tells you before it becomes a problem.

3. **Create an IAM user for daily work** (recommended, not blocking).
   Search "IAM" → *Users* → *Create user* → tick *Provide user access to the
   console* → attach the policy **AdministratorAccess** → sign out of root and
   use this from then on. Root is for billing and account changes only.

---

## Stage 1 — The database (1 hour)

> **The deadline this stage was written for is gone.** The Render free tier
> expired on 3 September 2026 and the database was *suspended*, not deleted —
> Render gives 13 days' grace. It is now on the paid `0.1c-256mb` plan
> ($6/month, identical specs, no expiry) and every row came back.
>
> So this is now an unhurried migration, and that is worth using: there is no
> reason to rush a step, and **Render stays exactly where it is until AWS is
> proven**. The one lesson kept from that week: a backup is useless if you wait
> for the deadline to take it. A *suspended* database refuses connections, so
> `backup.ps1` could not run either.

### 1.1 Create the server

Search **RDS** → *Create database*.

| Field | Choose |
|---|---|
| Method | Standard create |
| Engine | **PostgreSQL** |
| Version | **18.x** — see the note below; anything older may refuse the restore |
| Template | **Free tier** |
| DB instance identifier | `mop-careers-db` |
| Master username | `mop` |
| Master password | Generate a strong one. **Store it in a password manager.** |
| Instance | `db.t4g.micro` (chosen by the Free tier template) |
| Storage | 20 GB, disable storage autoscaling |
| **Public access** | **Yes** — needed so you can restore from your laptop |
| Initial database name | Expand *Additional configuration* → `mop_careers` |
| Backups | 7 days |

Creating takes about 10 minutes.

**On the version, precisely.** The backup you are restoring was taken from
**PostgreSQL 18.6**, and a dump cannot be restored into a server older than
itself without risking failures partway through. Read it off the dump rather
than trusting this paragraph:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --list `
    "backups\mop-careers_remote_2026-09-04_003338.dump" | Select-String "Dumped from"
```

If the RDS *Create database* screen does not offer an 18.x in your region,
**stop and say so** rather than picking 17 — that is a real decision (wait for
the version, choose another region, or dump the data in a downgrade-safe form),
not a detail to work around at the console.

### 1.2 Let your laptop reach it

RDS blocks everything by default.

Open the database → *Connectivity & security* → click the **VPC security
group** → *Inbound rules* → *Edit inbound rules* → *Add rule*:

- Type **PostgreSQL** (port 5432)
- Source **My IP**

Save. This allows only your current IP address.

### 1.3 Restore your backup

**Use `restore.ps1`, not a hand-typed `pg_restore`.** It picks the newest dump
and the newest client on the machine, refuses to restore over a database that
already has tables, stops on the first error instead of carrying on, and checks
the result afterwards.

From the repo folder, in PowerShell. `ENDPOINT` is on the database page and
ends `.rds.amazonaws.com`:

```powershell
$env:RESTORE_DATABASE_URL = "postgresql://mop:PASSWORD@ENDPOINT:5432/mop_careers?sslmode=require"
.\restore.ps1
```

Setting it as an environment variable rather than passing `-DatabaseUrl` keeps
the password out of your PowerShell history. `sslmode=require` matters: libpq
defaults to `prefer`, which **silently falls back to an unencrypted
connection** — over the public internet that is every student record in the
clear. The script adds it for remote hosts if you forget.

**Which dump.** With no `-DumpFile` it takes the newest in `backups\`, which is
what you want — `mop-careers_remote_2026-09-04_003338.dump`, 28 tables.
**Do not reach for the August one.** It has 26 tables, predates `assignments`
and `assignment_submissions`, and would restore a database the current code
does not match.

### 1.4 Check it landed

`restore.ps1` does this itself and prints it. A good result looks like:

```
  Tables in public:  28
  Rows:              users=11  programs=9  batches=2
  Schema version:    4677a2788420
  Code expects:      4677a2788420 -- matches.

Restore verified.
```

**Fewer than 28 tables and it stops you** — a half-finished restore still looks
like a database, and the missing piece only shows up when someone cannot sign
in. The schema-version line is the stronger check of the two: it proves the
dump matches the code you are about to run against it. If it reports the dump
is older, that is survivable — `alembic upgrade head` runs on every deploy —
but you should know it before, not after.

To re-check the database later without restoring again:

```powershell
.\restore.ps1 -VerifyOnly
```

### 1.5 Prove it with the live site

Before moving any hosting, point the **existing Render backend** at the new
database: Render dashboard → `mop-careers-api` → *Environment* → change
`DATABASE_URL` to the AWS connection string → save (it redeploys).

Two things to get right in that connection string: keep `?sslmode=require` on
it, and note that Render's outbound IP is **not** your laptop's — the security
group rule from 1.2 says *My IP*, so the API will not connect until you also
allow Render. The blunt version is a second inbound rule for
`0.0.0.0/0`; if you use it, **treat it as temporary and remove it** once App
Runner is doing the connecting from inside AWS in Stage 2, because it leaves
the database reachable from anywhere with the password alone.

Then use the live site — sign in, open a programme, save something in
Admin > Website. If it all works, your data is running on AWS while everything
else stays put. **If anything breaks, change `DATABASE_URL` back** and you have
lost nothing: the Render database is still there, still paid for, and still has
every row.

Take a fresh backup once you are satisfied, so there is a dump of the AWS copy
too:

```powershell
$env:BACKUP_DATABASE_URL = $env:RESTORE_DATABASE_URL
.\backup.ps1
```

Stop here if you like. Everything below is about moving the hosting, and none
of it has a deadline.

---

## Stage 2 — The backend (App Runner)

1. Search **App Runner** → *Create service*.
2. Source: **Source code repository** → connect GitHub → this repo, branch
   `master`.
3. Deployment trigger: **Automatic** (deploys on every push, like Render).
4. Build settings:
   - Runtime **Python 3**
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `cd backend && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Port: `8000`
5. Environment variables — *Add environment variable* for each:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the RDS connection string |
   | `JWT_SECRET` | a fresh strong secret — **do not reuse Render's** |
   | `APP_ENV` | `production` |
   | `CORS_ORIGINS` | the Amplify URL (fill in after Stage 3) |
   | `FRONTEND_URL` | same — it appears in password-reset emails |
   | `UPLOAD_DIR` | `/tmp/uploads` for now — see the note below |
   | `ENQUIRY_EMAIL`, `ADMIN_DOUBTS_EMAIL`, `SMTP_*` | as in DEPLOY.md |

6. Health check path: `/health`.
7. **Security → VPC connector**: App Runner must reach RDS. Either add App
   Runner's outbound VPC connector to the database's security group, or set the
   database security group to allow the App Runner service.

**On `UPLOAD_DIR`:** App Runner containers are ephemeral, so notes PDFs there
are lost on redeploy — the same problem Render has. **S3 (Stage 4) is the real
fix.** Until then teachers' uploads still do not survive.

---

## Stage 3 — The frontend (Amplify Hosting)

1. Search **Amplify** → *Create new app* → *Deploy from GitHub* → this repo,
   branch `master`.
2. Build settings — set the app root to `frontend`:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands: ["cd frontend", "npm ci"]
       build:
         commands: ["npm run build"]
     artifacts:
       baseDirectory: frontend/dist
       files: ["**/*"]
   ```
3. Environment variable: `VITE_API_URL` = the App Runner URL.

   **This is baked in at build time.** Changing it later does nothing until the
   frontend is rebuilt. That has already caused confusion once on this project.
4. Amplify handles SPA routing itself; `staticwebapp.config.json` in
   `frontend/public` is Azure-specific and simply ignored here.
5. Go back to App Runner and set `CORS_ORIGINS` and `FRONTEND_URL` to the
   Amplify URL. Restart it.

---

## Stage 4 — S3 for uploads (fixes a problem open since Phase 1)

Teachers' notes PDFs have been wiped on every deploy since the project started,
because neither Render nor App Runner has persistent disk. This is the fix, and
it also unblocks mentor and team photos.

1. Search **S3** → *Create bucket* → name `mop-careers-uploads`, block all
   public access **on**.
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on
   that bucket only.
3. **This needs a code change** — `backend/app/routers/teacher.py` writes to
   local disk today. Ask for it when you reach this stage.

---

## Stage 5 — The domain

`www.mopcareers.com` is registered at GoDaddy. The registrar stays there; only
the DNS records change.

1. Amplify → your app → *Hosting* → *Custom domains* → *Add domain* →
   `mopcareers.com`.
2. Amplify shows a **CNAME** target and a validation record.
3. In GoDaddy → *Domains* → `mopcareers.com` → *DNS*:
   - **Delete** the `A` record pointing at "Website Builder Site"
   - **Point** `www` at the Amplify target
   - **Add** the validation record Amplify gives you
4. Wait for the certificate to issue (minutes to an hour), then update
   `CORS_ORIGINS`, `FRONTEND_URL` and `VITE_API_URL` — and **rebuild the
   frontend**, or it will still call the old API URL.

---

## What it costs

| | First 12 months | After |
|---|---|---|
| RDS `db.t4g.micro` | **Free** | ~$15/month |
| App Runner | ~$25/month | ~$25/month |
| Amplify Hosting | Free tier covers this | ~$0–5/month |
| S3 | Pennies | Pennies |

So roughly **$25/month this year**, **$40/month after**. If that is too much,
**Lightsail** replaces App Runner at about $10/month, at the cost of managing
the server, TLS renewal and deployments yourself.

For comparison: staying on Render and upgrading only the database is **$6/month
and needs no migration at all** — and that is no longer hypothetical. It is
what is running right now, since 3 September. The case for moving has to be
made on something other than the database bill.

---

## After the move

- **Take a fresh backup** — `backup.ps1` with `BACKUP_DATABASE_URL` set to the
  RDS string.
- **Delete the Render services** only once everything works on AWS — and keep
  the *database* a while longer than the rest. It is $6/month for a warm copy
  of every row, which is the cheapest rollback available while the new setup is
  still new.
- **SMTP is still unconfigured.** Password resets and every notification reach
  the logs and nowhere else, on any host. Nobody can recover an account until
  this is fixed.
- **Change `Teacher@123` and `Student@123`** before real students enrol.
