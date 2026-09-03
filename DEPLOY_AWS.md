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

## Stage 1 — The database (1 hour) — **this kills the 3 September deadline**

The Render database is **deleted** on 3 September 2026, not suspended. Doing
this stage alone makes that survivable, before any hosting moves.

### 1.1 Create the server

Search **RDS** → *Create database*.

| Field | Choose |
|---|---|
| Method | Standard create |
| Engine | **PostgreSQL** |
| Version | **18.x** — match what Render runs, or the restore may refuse |
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

### 1.2 Let your laptop reach it

RDS blocks everything by default.

Open the database → *Connectivity & security* → click the **VPC security
group** → *Inbound rules* → *Edit inbound rules* → *Add rule*:

- Type **PostgreSQL** (port 5432)
- Source **My IP**

Save. This allows only your current IP address.

### 1.3 Restore your backup

You already have a verified dump — `backup.ps1` produced it in the right
format. In PowerShell, from the repo folder:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --no-owner --no-acl `
    --dbname "postgresql://mop:PASSWORD@ENDPOINT:5432/mop_careers" `
    "backups\mop-careers_remote_2026-08-15_084952.dump"
```

`ENDPOINT` is on the database page, ending `.rds.amazonaws.com`.

### 1.4 Check it landed

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" "postgresql://mop:PASSWORD@ENDPOINT:5432/mop_careers" -c "\dt"
```

**Expect 26 tables.** Fewer means the restore did not finish — do not go on.

### 1.5 Prove it with the live site

Before moving any hosting, point the **existing Render backend** at the new
database: Render dashboard → `mop-careers-api` → *Environment* → change
`DATABASE_URL` to the AWS connection string → save (it redeploys).

Then use the live site — sign in, open a programme, save something in
Admin > Website. If it all works, your data is on AWS and the deadline is dealt
with. **If anything breaks, change `DATABASE_URL` back** and you have lost
nothing.

Stop here if you like. Everything below is about moving the hosting, and has no
deadline.

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

For comparison: staying on Render and upgrading only the database is about
**$7/month** and needs no migration at all.

---

## After the move

- **Take a fresh backup** — `backup.ps1` with `BACKUP_DATABASE_URL` set to the
  RDS string.
- **Delete the Render services** only once everything works on AWS.
- **SMTP is still unconfigured.** Password resets and every notification reach
  the logs and nowhere else, on any host. Nobody can recover an account until
  this is fixed.
- **Change `Teacher@123` and `Student@123`** before real students enrol.
