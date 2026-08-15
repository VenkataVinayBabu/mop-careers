# Deploying MOP Careers to Azure

Bala's decision, 15 Aug 2026: **Azure only**, replacing Render.

This mirrors [DEPLOY.md](DEPLOY.md), which describes the Render setup that is
live today. Follow this one in order — each step is reversible on its own, and
the sequence is chosen so the data is safe before any hosting moves.

> **Do not paste connection strings into a chat, a ticket or a commit.** They
> grant full access to every student record. Type them straight into the Azure
> portal.

---

## What replaces what

| Render today | Azure |
|---|---|
| `mop-careers-db` — PostgreSQL free | **Azure Database for PostgreSQL Flexible Server** |
| `mop-careers-api` — Python web service | **App Service (Linux, Python 3.13)** |
| `mop-careers` — static site | **Azure Static Web Apps** |
| *(nothing — uploads are wiped on deploy)* | **App Service `/home`**, which persists |

## What it will cost

Worth agreeing before starting, because discovering it later is how a migration
gets abandoned half-done.

| Service | Free? | After that |
|---|---|---|
| PostgreSQL Flexible Server (B1ms, 32 GB) | 12 months on a **new** Azure account | ~$12–15/month |
| App Service | F1 free tier exists but gives **60 CPU-minutes/day**, no always-on, no SSL on a custom domain — not usable for this API | B1 ~$13/month |
| Static Web Apps | Yes, genuinely | Free |
| Outbound data | Small at this volume | Pennies |

Budget **$25–30/month** once trial credits end. For comparison, simply
upgrading the Render database costs about $7/month and solves the expiry
deadline and nothing else.

---

## 1. The database first

Doing this before any hosting move means the **3 September deletion deadline is
defused** even if the rest slips.

1. Create **Azure Database for PostgreSQL Flexible Server**
   - Workload: Development · Compute: Burstable **B1ms** · Storage 32 GB
   - PostgreSQL version **18** to match what Render runs today
   - Note the admin username and password; set the password in the portal only
2. **Networking** → allow public access, then add a firewall rule for your own
   IP so `pg_restore` can reach it. Tick *Allow Azure services to access this
   server* so App Service can connect later.
3. Create the database itself:
   ```
   CREATE DATABASE mop_careers;
   ```
4. Restore the most recent dump — `backup.ps1` produces exactly the right
   format:
   ```
   & "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" --no-owner --no-acl `
       --dbname "postgresql://USER:PASS@SERVER.postgres.database.azure.com/mop_careers?sslmode=require" `
       "backups\mop-careers_remote_YYYY-MM-DD_HHMMSS.dump"
   ```
5. Confirm it landed — **26 tables** as of 15 Aug 2026:
   ```
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" "CONNECTION_STRING" -c "\dt"
   ```

### Prove it before moving on

Point the **existing Render backend** at the Azure database: change
`DATABASE_URL` in the Render dashboard, redeploy, and use the site. If it works,
the data half of the migration is done and proven while the old hosting is still
carrying it. If it does not, change the variable back and nothing is lost.

---

## 2. Backend on App Service

1. Create an **App Service** — Linux, Python 3.13, plan **B1**.
2. **Configuration → General settings → Startup Command**. This is the same
   command Render runs, so migrations still apply on every deploy:
   ```
   alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   App Service expects the app on port 8000 by default; if you change it, set
   `WEBSITES_PORT` to match.
3. **Configuration → Application settings**:

   | Setting | Value |
   |---|---|
   | `DATABASE_URL` | the Azure Postgres connection string, with `?sslmode=require` |
   | `JWT_SECRET` | a fresh strong secret — **do not reuse Render's** |
   | `APP_ENV` | `production` |
   | `CORS_ORIGINS` | the Static Web App URL, then the custom domain |
   | `FRONTEND_URL` | same — it appears in password-reset emails |
   | `UPLOAD_DIR` | `/home/data` — see below |
   | `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` |
   | `ENQUIRY_EMAIL`, `ADMIN_DOUBTS_EMAIL`, `SMTP_*` | as per DEPLOY.md |

4. **Deployment Center** → GitHub → this repo, branch `master`, and set the
   build root to `backend`. Azure writes the workflow for you.

### `UPLOAD_DIR=/home/data` is the point

Notes PDFs uploaded by teachers have been wiped on every deploy since the
project started, because Render's free tier has no persistent disk. **App
Service mounts `/home` on Azure Files, which survives restarts and deploys.**
Setting `UPLOAD_DIR=/home/data` makes uploaded notes persist — a problem that
has been open since Phase 1, fixed by one setting.

It does not solve photos, which are still links, and Blob Storage remains the
better long-term answer for both. But it stops the bleeding immediately.

---

## 3. Frontend on Static Web Apps

1. Create a **Static Web App**, linked to this GitHub repo, branch `master`.
2. Build settings:
   - App location: `frontend`
   - Output location: `dist`
   - Build command: `npm run build`
3. **Configuration → Environment variables**, set for the **build**:
   ```
   VITE_API_URL = https://<your-app-service>.azurewebsites.net
   ```

   **`VITE_API_URL` is baked in at build time.** Changing it in the portal does
   nothing until the frontend is rebuilt. This has already caused confusion once
   on this project — see CLAUDE.md thread 3.
4. `frontend/public/staticwebapp.config.json` is already committed. It rewrites
   unknown paths to `index.html` so client-side routes like `/about` and
   `/programs/data-analytics-with-ai` do not 404 when someone refreshes or
   opens a shared link. Assets and the team photos are excluded from the
   rewrite, or a missing image would return the HTML page instead of a 404.

---

## 4. Cut over

1. Set `CORS_ORIGINS` and `FRONTEND_URL` on App Service to the Static Web App
   URL, and restart it.
2. Walk the site: public pages, login, an admin save, a teacher upload, a
   student assignment. The write paths are what break after a move, not the
   reads.
3. **mopcareers.com** — as of 15 Aug 2026 it resolves nowhere, so there is
   nothing live to break. In Static Web Apps → Custom domains, add it and
   follow the DNS records into GoDaddy. Then update `CORS_ORIGINS`,
   `FRONTEND_URL` and `VITE_API_URL` again, and **rebuild the frontend**.
4. Only once all of that works: delete the Render services.

---

## After the move

- **Take a fresh backup** — `backup.ps1` with `BACKUP_DATABASE_URL` pointing at
  Azure. The script picks the newest `pg_dump` on the machine, which must be at
  least as new as the server.
- **Rotate `JWT_SECRET`** if it was ever shared. Every existing session is
  invalidated, which is the intended effect.
- **SMTP is still unconfigured.** Password resets and every notification reach
  the logs and nowhere else. Moving host does not change that.
- Azure App Service on B1 does **not** sleep, so the 30–60 second cold start
  that plagues the Render free tier disappears. The warm-up ping and 75-second
  timeout in the frontend become unnecessary, though harmless.
