# Deploying MOP Careers

Goal: a public URL anyone can open, that keeps working when your laptop is off.

Three pieces on **Render**: a PostgreSQL database, the FastAPI backend, and the
React frontend as a static site. `render.yaml` in the project root defines all
three.

---

## Before you start

You need:

- A **GitHub repository** with this code pushed to it — Render deploys from a repo
- A **Render account** — <https://render.com>, sign in with GitHub
- A **real admin password**, decided by you. Not `Admin@123`.

---

## 1. Push the code to GitHub

Create an **empty** repository on GitHub — no README, no .gitignore, no licence,
or the first push will conflict.

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

```bash
git push -u origin master
```

Nothing sensitive goes up: `backend/.env` and `frontend/.env` are gitignored, so
your database password and JWT secret stay on your machine.

---

## 2. Create the services on Render

In Render: **New → Blueprint**, pick the repository, and Render reads
`render.yaml` and creates all three services.

The first backend deploy runs `alembic upgrade head`, so the 15 tables are
created automatically.

---

## 3. Fill in the settings Render can't guess

Once the services exist you'll have two URLs, something like:

```
https://mop-careers.onrender.com        <- frontend
https://mop-careers-api.onrender.com    <- backend
```

They reference each other, so set these in the dashboard:

**On `mop-careers-api` → Environment**

| Key | Value |
|---|---|
| `CORS_ORIGINS` | the frontend URL |
| `FRONTEND_URL` | the frontend URL (used in password reset emails) |
| `ENQUIRY_EMAIL` | where website enquiries go |
| `ADMIN_DOUBTS_EMAIL` | where technical doubts go |

**On `mop-careers` (frontend) → Environment**

| Key | Value |
|---|---|
| `VITE_API_URL` | the backend URL |

`VITE_API_URL` is baked in at build time, so **redeploy the frontend** after
setting it.

---

## 4. Create the first admin

The seed script creates demo accounts with published passwords. Do **not** run it
on a live site you're sharing.

Instead, open a Shell on the backend service in Render and create one real admin:

```bash
python -c "from app.database import SessionLocal; from app.models import User, ROLE_ADMIN; from app.security import hash_password; import getpass; db=SessionLocal(); pw=getpass.getpass('Admin password: '); db.add(User(name='MOP Administrator', email='admin@mopcareers.com', role=ROLE_ADMIN, password_hash=hash_password(pw), must_change_password=False)); db.commit(); print('admin created')"
```

You type the password; it is never written to a file or this repository.

If you'd rather show the demo data, run `python -m app.seed` instead — but
change the admin password immediately afterwards, and remember the site is
public.

---

## Things to know before real students use it

**Uploaded files disappear on redeploy.** Render's free tier has no persistent
disk, so notes PDFs uploaded by teachers are lost whenever the backend
redeploys. Fixing this properly means either a paid Render Disk or moving
uploads to object storage (S3, Cloudflare R2). Recordings and notes links are
unaffected — only uploaded files.

**The free database expires.** Render's free PostgreSQL is time-limited. Check
the current terms and move to a paid plan before real data goes in.

**The free web service sleeps.** After a period of inactivity the backend spins
down, so the first request afterwards takes 30–60 seconds. Fine for a demo,
irritating for daily use.

**Email is not configured.** With `SMTP_HOST` empty, password resets and
notifications are written to the logs instead of sent. Set the SMTP variables
before anyone needs a working password reset.

**The rate limit is per process.** The public enquiry form's throttle is held in
memory, so it resets on redeploy and doesn't coordinate across instances.

---

## Updating the live site

Render redeploys automatically on every push to the branch it tracks:

```bash
git push
```

Database changes are applied by `alembic upgrade head`, which runs before the
server starts on each deploy.
