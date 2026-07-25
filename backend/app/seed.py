"""Seed the database with a working demo dataset.

Run with:  python -m app.seed        (add --reset to wipe Phase 1 data first)

Idempotent: re-running updates the existing rows rather than duplicating them.
"""
import argparse
import random
import sys
from datetime import date, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.curriculum import ensure_curriculum
from app.database import SessionLocal
from app.models import (
    BATCH_ACTIVE,
    DAY_COMPLETED,
    ROLE_ADMIN,
    ROLE_STUDENT,
    ROLE_TEACHER,
    Attendance,
    Batch,
    CurriculumDay,
    Milestone,
    PasswordResetToken,
    TeacherBatch,
    User,
)
from app.security import hash_password

BATCH_NAME = "PFS-2026-JAN"
COMPLETED_THROUGH_DAY = 8   # days 1-8 are "already taught" so dashboards have data

ADMIN = {"name": "MOP Administrator", "email": "admin@mopcareers.com", "password": "Admin@123", "phone": "9000000001"}
TEACHER = {"name": "Ravi Kumar", "email": "ravi.kumar@mopcareers.com", "password": "Teacher@123", "phone": "9000000002"}

STUDENTS = [
    {"name": "Aditya Sharma",  "email": "aditya.sharma@example.com",  "phone": "9000000101", "yoe_it": 0.0},
    {"name": "Bhavana Reddy",  "email": "bhavana.reddy@example.com",  "phone": "9000000102", "yoe_it": 1.5},
    {"name": "Charan Teja",    "email": "charan.teja@example.com",    "phone": "9000000103", "yoe_it": 2.0},
    {"name": "Divya Nair",     "email": "divya.nair@example.com",     "phone": "9000000104", "yoe_it": 0.0},
    {"name": "Eshwar Prasad",  "email": "eshwar.prasad@example.com",  "phone": "9000000105", "yoe_it": 3.0},
]
STUDENT_PASSWORD = "Student@123"

# Only the last student keeps must_change_password=True, so the forced-change
# screen can be exercised in the UI while the other logins stay usable for testing.
FORCE_CHANGE_EMAIL = STUDENTS[-1]["email"]


def upsert_user(db: Session, *, name: str, email: str, password: str, role: str,
                phone: str | None = None, must_change: bool = False,
                yoe_it: float | None = None, batch_id: int | None = None) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email)
        db.add(user)
    user.name = name
    user.phone = phone
    user.role = role
    user.password_hash = hash_password(password)
    user.must_change_password = must_change
    user.is_blocked = False
    user.yoe_it = yoe_it
    user.batch_id = batch_id
    db.flush()
    return user


def reset_data(db: Session) -> None:
    """Drop all Phase 1 rows. Destructive — only runs behind --reset."""
    db.execute(delete(Attendance))
    db.execute(delete(PasswordResetToken))
    db.execute(delete(CurriculumDay))
    db.execute(delete(TeacherBatch))
    db.execute(delete(Milestone))
    db.execute(delete(User))
    db.execute(delete(Batch))
    db.commit()
    print("  Cleared existing Phase 1 data.")


def seed(reset: bool = False) -> None:
    db = SessionLocal()
    try:
        print("Seeding MOP Careers demo data...")
        if reset:
            reset_data(db)

        # --- admin --------------------------------------------------------
        upsert_user(db, name=ADMIN["name"], email=ADMIN["email"], password=ADMIN["password"],
                    role=ROLE_ADMIN, phone=ADMIN["phone"], must_change=False)
        print(f"  Admin:   {ADMIN['email']} / {ADMIN['password']}")

        # --- batch --------------------------------------------------------
        start = date.today() - timedelta(days=COMPLETED_THROUGH_DAY * 2)
        batch = db.scalar(select(Batch).where(Batch.name == BATCH_NAME))
        if batch is None:
            batch = Batch(name=BATCH_NAME)
            db.add(batch)
        batch.course_type = "Python Full Stack"
        batch.start_date = start
        batch.status = BATCH_ACTIVE
        db.flush()

        ensure_curriculum(db, batch.id)
        db.flush()
        print(f"  Batch:   {batch.name} (55 curriculum days)")

        # --- teacher ------------------------------------------------------
        teacher = upsert_user(db, name=TEACHER["name"], email=TEACHER["email"],
                              password=TEACHER["password"], role=ROLE_TEACHER,
                              phone=TEACHER["phone"], must_change=False)
        if not db.scalar(
            select(TeacherBatch).where(
                TeacherBatch.teacher_id == teacher.id, TeacherBatch.batch_id == batch.id
            )
        ):
            db.add(TeacherBatch(teacher_id=teacher.id, batch_id=batch.id))
        print(f"  Teacher: {TEACHER['email']} / {TEACHER['password']}  -> {batch.name}")

        # --- students -----------------------------------------------------
        students: list[User] = []
        for spec in STUDENTS:
            force = spec["email"] == FORCE_CHANGE_EMAIL
            s = upsert_user(db, name=spec["name"], email=spec["email"],
                            password=STUDENT_PASSWORD, role=ROLE_STUDENT,
                            phone=spec["phone"], must_change=force,
                            yoe_it=spec["yoe_it"], batch_id=batch.id)
            students.append(s)

            ms = db.scalar(select(Milestone).where(Milestone.student_id == s.id))
            if ms is None:
                ms = Milestone(student_id=s.id)
                db.add(ms)
            ms.enrolled = start - timedelta(days=10)
            ms.batch_assigned = start - timedelta(days=3)
            ms.batch_started = start
            db.flush()
        print(f"  Students: {len(students)} enrolled, password {STUDENT_PASSWORD}")
        print(f"            ({FORCE_CHANGE_EMAIL} must change password on first login)")

        # --- mark early days taught, with attendance ----------------------
        rng = random.Random(20260125)   # fixed seed keeps the demo reproducible
        days = db.scalars(
            select(CurriculumDay)
            .where(CurriculumDay.batch_id == batch.id)
            .order_by(CurriculumDay.day_number)
        ).all()

        for day in days:
            if day.day_number <= COMPLETED_THROUGH_DAY:
                day.scheduled_date = start + timedelta(days=(day.day_number - 1) * 2)
                day.status = DAY_COMPLETED
                day.recording_url = (
                    f"https://recordings.mopcareers.com/{batch.name.lower()}/day-{day.day_number}"
                )
            elif day.day_number <= COMPLETED_THROUGH_DAY + 6:
                # Next few classes get dates so the Schedule page has content.
                day.scheduled_date = start + timedelta(days=(day.day_number - 1) * 2)
        db.flush()

        completed_days = [d for d in days if d.day_number <= COMPLETED_THROUGH_DAY]
        existing = {
            (a.student_id, a.curriculum_day_id)
            for a in db.scalars(select(Attendance)).all()
        }
        marked = 0
        for student in students:
            for day in completed_days:
                if (student.id, day.id) in existing:
                    continue
                # ~85% present, so Missed Classes is not empty.
                db.add(
                    Attendance(
                        student_id=student.id,
                        curriculum_day_id=day.id,
                        present=rng.random() < 0.85,
                    )
                )
                marked += 1
        print(f"  Curriculum: days 1-{COMPLETED_THROUGH_DAY} marked complete, "
              f"{marked} attendance records created")

        db.commit()
        print("\nSeed complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed MOP Careers demo data.")
    parser.add_argument("--reset", action="store_true", help="delete existing Phase 1 data first")
    args = parser.parse_args()
    try:
        seed(reset=args.reset)
    except Exception as exc:  # pragma: no cover
        print(f"\nSeed failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        raise SystemExit(1)
