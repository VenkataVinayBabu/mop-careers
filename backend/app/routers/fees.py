"""Fee management. **Admin only — students must never see fee data.**

The router-level `dependencies=[Depends(require_admin)]` is the hard lock: every
route inherits it, so a new endpoint added here cannot accidentally be exposed to
a student or teacher.

Balance is never stored. It is always total_fee minus the sum of payments, so the
two cannot drift apart.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_student_or_404, require_admin
from app.models import ROLE_STUDENT, Batch, FeePayment, FeeRecord, User
from app.schemas import (
    BatchCollectionSummary,
    FeePaymentCreate,
    FeePaymentOut,
    FeeSetRequest,
    FeeSummaryRow,
    MessageResponse,
    StudentFeeOut,
)

router = APIRouter(prefix="/admin/fees", tags=["fees"], dependencies=[Depends(require_admin)])

ZERO = Decimal("0.00")


def _paid_total(db: Session, student_id: int) -> Decimal:
    total = db.scalar(
        select(func.coalesce(func.sum(FeePayment.amount), 0)).where(
            FeePayment.student_id == student_id
        )
    )
    return Decimal(str(total or 0))


def _fee_out(db: Session, student: User) -> StudentFeeOut:
    record = db.scalar(select(FeeRecord).where(FeeRecord.student_id == student.id))
    total = Decimal(str(record.total_fee)) if record else ZERO
    paid = _paid_total(db, student.id)

    payments = db.scalars(
        select(FeePayment)
        .where(FeePayment.student_id == student.id)
        .order_by(FeePayment.paid_on.desc(), FeePayment.id.desc())
    ).all()

    batch = db.get(Batch, student.batch_id) if student.batch_id else None

    return StudentFeeOut(
        student_id=student.id,
        student_name=student.name,
        email=student.email,
        batch_id=student.batch_id,
        batch_name=batch.name if batch else None,
        total_fee=float(total),
        paid=float(paid),
        balance=float(total - paid),
        notes=record.notes if record else None,
        payments=[FeePaymentOut.model_validate(p) for p in payments],
    )


@router.get("", response_model=list[FeeSummaryRow])
def list_fees(
    batch_id: int | None = None,
    pending_only: bool = False,
    db: Session = Depends(get_db),
) -> list[FeeSummaryRow]:
    """Every student's fee position. `pending_only=true` gives the outstanding list."""
    stmt = select(User).where(User.role == ROLE_STUDENT)
    if batch_id is not None:
        stmt = stmt.where(User.batch_id == batch_id)

    rows: list[FeeSummaryRow] = []
    for student in db.scalars(stmt.order_by(User.name)).all():
        record = db.scalar(select(FeeRecord).where(FeeRecord.student_id == student.id))
        total = Decimal(str(record.total_fee)) if record else ZERO
        paid = _paid_total(db, student.id)
        balance = total - paid

        if pending_only and balance <= ZERO:
            continue

        batch = db.get(Batch, student.batch_id) if student.batch_id else None
        rows.append(
            FeeSummaryRow(
                student_id=student.id,
                student_name=student.name,
                batch_name=batch.name if batch else None,
                total_fee=float(total),
                paid=float(paid),
                balance=float(balance),
            )
        )
    return rows


@router.get("/summary", response_model=list[BatchCollectionSummary])
def collection_summary(db: Session = Depends(get_db)) -> list[BatchCollectionSummary]:
    """Batch-wise collection totals."""
    out: list[BatchCollectionSummary] = []
    for batch in db.scalars(select(Batch).order_by(Batch.created_at.desc())).all():
        students = db.scalars(
            select(User).where(User.batch_id == batch.id, User.role == ROLE_STUDENT)
        ).all()

        billed = ZERO
        collected = ZERO
        for s in students:
            record = db.scalar(select(FeeRecord).where(FeeRecord.student_id == s.id))
            if record:
                billed += Decimal(str(record.total_fee))
            collected += _paid_total(db, s.id)

        out.append(
            BatchCollectionSummary(
                batch_id=batch.id,
                batch_name=batch.name,
                student_count=len(students),
                total_billed=float(billed),
                total_collected=float(collected),
                outstanding=float(billed - collected),
                collection_percent=(
                    round(float(collected / billed * 100), 1) if billed > ZERO else 0.0
                ),
            )
        )
    return out


@router.get("/{student_id}", response_model=StudentFeeOut)
def get_student_fee(student_id: int, db: Session = Depends(get_db)) -> StudentFeeOut:
    student = get_student_or_404(db, student_id)
    return _fee_out(db, student)


@router.put("/{student_id}", response_model=StudentFeeOut)
def set_total_fee(
    student_id: int, payload: FeeSetRequest, db: Session = Depends(get_db)
) -> StudentFeeOut:
    student = get_student_or_404(db, student_id)

    record = db.scalar(select(FeeRecord).where(FeeRecord.student_id == student_id))
    if record is None:
        record = FeeRecord(student_id=student_id)
        db.add(record)

    record.total_fee = payload.total_fee
    record.notes = payload.notes
    db.commit()
    return _fee_out(db, student)


@router.post("/{student_id}/payments", response_model=StudentFeeOut, status_code=status.HTTP_201_CREATED)
def add_payment(
    student_id: int, payload: FeePaymentCreate, db: Session = Depends(get_db)
) -> StudentFeeOut:
    student = get_student_or_404(db, student_id)

    record = db.scalar(select(FeeRecord).where(FeeRecord.student_id == student_id))
    if record is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Set this student's total fee before recording a payment",
        )

    # Refuse an overpayment rather than silently producing a negative balance.
    new_total = _paid_total(db, student_id) + Decimal(str(payload.amount))
    if new_total > Decimal(str(record.total_fee)):
        already = float(_paid_total(db, student_id))
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Payment exceeds the outstanding balance "
            f"(total {record.total_fee}, already paid {already})",
        )

    db.add(
        FeePayment(
            student_id=student_id,
            amount=payload.amount,
            paid_on=payload.paid_on,
            mode=payload.mode,
            reference=payload.reference,
        )
    )
    db.commit()
    return _fee_out(db, student)


@router.delete("/{student_id}/payments/{payment_id}", response_model=StudentFeeOut)
def delete_payment(
    student_id: int, payment_id: int, db: Session = Depends(get_db)
) -> StudentFeeOut:
    student = get_student_or_404(db, student_id)

    payment = db.get(FeePayment, payment_id)
    if payment is None or payment.student_id != student_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")

    db.delete(payment)
    db.commit()
    return _fee_out(db, student)


@router.delete("/{student_id}", response_model=MessageResponse)
def clear_fee_record(student_id: int, db: Session = Depends(get_db)) -> MessageResponse:
    """Remove the fee record and every payment for one student."""
    get_student_or_404(db, student_id)

    for payment in db.scalars(
        select(FeePayment).where(FeePayment.student_id == student_id)
    ).all():
        db.delete(payment)

    record = db.scalar(select(FeeRecord).where(FeeRecord.student_id == student_id))
    if record:
        db.delete(record)

    db.commit()
    return MessageResponse(message="Fee record cleared")
