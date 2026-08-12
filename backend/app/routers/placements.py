"""Placements: companies, applications and interview rounds.

Admin-only, enforced at router level. Students reach their own applications
read-only through /student/applications (see routers/student.py) — teachers get
nothing here, per the spec.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_student_or_404, require_back_office
from app.models import (
    PLACED_STATUSES,
    ROLE_STUDENT,
    Application,
    Batch,
    Company,
    InterviewRound,
    User,
)
from app.schemas import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationUpdate,
    CompanyCreate,
    CompanyOut,
    CompanyUpdate,
    InterviewRoundCreate,
    InterviewRoundOut,
    InterviewRoundUpdate,
    MessageResponse,
    PlacementStats,
)

router = APIRouter(prefix="/admin/placements", tags=["placements"],
                   dependencies=[Depends(require_back_office)])


def _app_out(app: Application) -> ApplicationOut:
    data = ApplicationOut.model_validate(app)
    data.student_name = app.student.name if app.student else ""
    data.company_name = app.company.name if app.company else ""
    return data


def _load_application(db: Session, application_id: int) -> Application:
    app = db.scalar(
        select(Application)
        .options(
            selectinload(Application.student),
            selectinload(Application.company),
            selectinload(Application.rounds),
        )
        .where(Application.id == application_id)
    )
    if app is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return app


# --- companies ------------------------------------------------------------
@router.get("/companies", response_model=list[CompanyOut])
def list_companies(db: Session = Depends(get_db)) -> list[CompanyOut]:
    out: list[CompanyOut] = []
    for c in db.scalars(select(Company).order_by(Company.name)).all():
        data = CompanyOut.model_validate(c)
        data.application_count = db.scalar(
            select(func.count(Application.id)).where(Application.company_id == c.id)
        ) or 0
        out.append(data)
    return out


@router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> CompanyOut:
    if db.scalar(select(Company).where(func.lower(Company.name) == payload.name.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "A company with that name already exists")

    company = Company(**payload.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyOut.model_validate(company)


@router.patch("/companies/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int, payload: CompanyUpdate, db: Session = Depends(get_db)
) -> CompanyOut:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Company not found")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("name"):
        clash = db.scalar(
            select(Company).where(
                func.lower(Company.name) == updates["name"].lower(), Company.id != company_id
            )
        )
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, "A company with that name already exists")

    for field, value in updates.items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    return CompanyOut.model_validate(company)


@router.delete("/companies/{company_id}", response_model=MessageResponse)
def delete_company(company_id: int, db: Session = Depends(get_db)) -> MessageResponse:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Company not found")

    count = db.scalar(
        select(func.count(Application.id)).where(Application.company_id == company_id)
    ) or 0
    if count:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot delete — {count} application(s) reference this company",
        )

    db.delete(company)
    db.commit()
    return MessageResponse(message="Company deleted")


# --- applications ---------------------------------------------------------
@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(
    batch_id: int | None = None,
    student_id: int | None = None,
    company_id: int | None = None,
    app_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[ApplicationOut]:
    stmt = select(Application).options(
        selectinload(Application.student),
        selectinload(Application.company),
        selectinload(Application.rounds),
    )
    if student_id is not None:
        stmt = stmt.where(Application.student_id == student_id)
    if company_id is not None:
        stmt = stmt.where(Application.company_id == company_id)
    if app_status:
        stmt = stmt.where(Application.status == app_status)
    if batch_id is not None:
        stmt = stmt.join(User, Application.student_id == User.id).where(User.batch_id == batch_id)

    apps = db.scalars(stmt.order_by(Application.created_at.desc())).all()
    return [_app_out(a) for a in apps]


@router.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate, db: Session = Depends(get_db)
) -> ApplicationOut:
    get_student_or_404(db, payload.student_id)
    if db.get(Company, payload.company_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Company not found")

    app = Application(**payload.model_dump())
    db.add(app)
    db.commit()
    return _app_out(_load_application(db, app.id))


@router.patch("/applications/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int, payload: ApplicationUpdate, db: Session = Depends(get_db)
) -> ApplicationOut:
    app = _load_application(db, application_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    db.commit()
    return _app_out(_load_application(db, application_id))


@router.delete("/applications/{application_id}", response_model=MessageResponse)
def delete_application(application_id: int, db: Session = Depends(get_db)) -> MessageResponse:
    app = _load_application(db, application_id)
    db.delete(app)
    db.commit()
    return MessageResponse(message="Application deleted")


# --- interview rounds -----------------------------------------------------
@router.post(
    "/applications/{application_id}/rounds",
    response_model=InterviewRoundOut,
    status_code=status.HTTP_201_CREATED,
)
def add_round(
    application_id: int, payload: InterviewRoundCreate, db: Session = Depends(get_db)
) -> InterviewRoundOut:
    _load_application(db, application_id)
    rnd = InterviewRound(application_id=application_id, **payload.model_dump())
    db.add(rnd)
    db.commit()
    db.refresh(rnd)
    return InterviewRoundOut.model_validate(rnd)


@router.patch("/rounds/{round_id}", response_model=InterviewRoundOut)
def update_round(
    round_id: int, payload: InterviewRoundUpdate, db: Session = Depends(get_db)
) -> InterviewRoundOut:
    rnd = db.get(InterviewRound, round_id)
    if rnd is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview round not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rnd, field, value)
    db.commit()
    db.refresh(rnd)
    return InterviewRoundOut.model_validate(rnd)


@router.delete("/rounds/{round_id}", response_model=MessageResponse)
def delete_round(round_id: int, db: Session = Depends(get_db)) -> MessageResponse:
    rnd = db.get(InterviewRound, round_id)
    if rnd is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview round not found")
    db.delete(rnd)
    db.commit()
    return MessageResponse(message="Interview round deleted")


# --- stats ----------------------------------------------------------------
def _stats_for(db: Session, students: list[User], batch: Batch | None) -> PlacementStats:
    student_ids = [s.id for s in students]
    if not student_ids:
        return PlacementStats(
            batch_id=batch.id if batch else None,
            batch_name=batch.name if batch else "All batches",
            total_students=0,
            placed_count=0,
            placed_percent=0.0,
        )

    apps = db.scalars(
        select(Application).where(Application.student_id.in_(student_ids))
    ).all()

    # Best package per placed student, so a student with several offers is
    # counted once and at their strongest offer.
    best: dict[int, Decimal] = {}
    placed: set[int] = set()
    for a in apps:
        if a.status in PLACED_STATUSES:
            placed.add(a.student_id)
            if a.package_lpa is not None:
                pkg = Decimal(str(a.package_lpa))
                if a.student_id not in best or pkg > best[a.student_id]:
                    best[a.student_id] = pkg

    packages = list(best.values())
    return PlacementStats(
        batch_id=batch.id if batch else None,
        batch_name=batch.name if batch else "All batches",
        total_students=len(student_ids),
        placed_count=len(placed),
        placed_percent=round(len(placed) / len(student_ids) * 100, 1),
        average_package=(
            round(float(sum(packages) / len(packages)), 2) if packages else None
        ),
        highest_package=round(float(max(packages)), 2) if packages else None,
        applications=len(apps),
    )


@router.get("/stats", response_model=list[PlacementStats])
def placement_stats(db: Session = Depends(get_db)) -> list[PlacementStats]:
    """Batch-wise placement stats, with an overall row first."""
    all_students = db.scalars(select(User).where(User.role == ROLE_STUDENT)).all()
    out = [_stats_for(db, list(all_students), None)]

    for batch in db.scalars(select(Batch).order_by(Batch.created_at.desc())).all():
        students = db.scalars(
            select(User).where(User.batch_id == batch.id, User.role == ROLE_STUDENT)
        ).all()
        out.append(_stats_for(db, list(students), batch))
    return out
