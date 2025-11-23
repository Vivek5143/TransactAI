# api/insights.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, date, timedelta

from api.db import get_db, engine
from api.models import Transaction

router = APIRouter()

# Helper to ensure Transaction table exists (no-op if already created elsewhere)
with engine.connect() as conn:
    # Do nothing here - assume Base.metadata.create_all was already called
    pass


@router.get("/monthly")
def monthly_insights(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns category-wise totals and daily breakdown for the requested month.
    Defaults to current year/month if not provided.
    """
    if year is None or month is None:
        today = date.today()
        year = year or today.year
        month = month or today.month

    try:
        start = date(year, month, 1)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid year/month")

    # compute next month start
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    # Total spent in month
    total_spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.txn_time >= start, Transaction.txn_time < next_month)
        .scalar()
    )

    # Count transactions
    total_tx = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.txn_time >= start, Transaction.txn_time < next_month)
        .scalar()
    )

    # Category-wise aggregation
    cat_rows = (
        db.query(Transaction.predicted_category, func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.txn_time >= start, Transaction.txn_time < next_month)
        .group_by(Transaction.predicted_category)
        .all()
    )
    category_summary = {row[0] or "Unknown": float(row[1]) for row in cat_rows}

    # Daily breakdown
    day_rows = (
        db.query(
            func.date(Transaction.txn_time).label("day"),
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        )
        .filter(Transaction.txn_time >= start, Transaction.txn_time < next_month)
        .group_by(func.date(Transaction.txn_time))
        .order_by(func.date(Transaction.txn_time))
        .all()
    )
    daily = [{ "date": str(r.day), "total": float(r.total) } for r in day_rows]

    return {
        "year": year,
        "month": month,
        "total_spent": float(total_spent),
        "total_transactions": int(total_tx),
        "category_summary": category_summary,
        "daily_breakdown": daily
    }


@router.get("/weekly")
def weekly_insights(
    days: int = Query(7, ge=1, le=30),
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns last `days` daily totals and category splits.
    Default days=7 (last 7 days).
    """
    if end_date is None:
        end = date.today()
    else:
        end = end_date

    start = end - timedelta(days=days-1)  # inclusive

    total_spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.txn_time >= start, Transaction.txn_time <= end + timedelta(days=1))
        .scalar()
    )

    # Daily totals
    day_rows = (
        db.query(
            func.date(Transaction.txn_time).label("day"),
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        )
        .filter(Transaction.txn_time >= start, Transaction.txn_time <= end + timedelta(days=1))
        .group_by(func.date(Transaction.txn_time))
        .order_by(func.date(Transaction.txn_time))
        .all()
    )
    daily = [{ "date": str(r.day), "total": float(r.total) } for r in day_rows]

    # Category split across window
    cat_rows = (
        db.query(Transaction.predicted_category, func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.txn_time >= start, Transaction.txn_time <= end + timedelta(days=1))
        .group_by(Transaction.predicted_category)
        .all()
    )
    category_summary = {row[0] or "Unknown": float(row[1]) for row in cat_rows}

    return {
        "start_date": str(start),
        "end_date": str(end),
        "total_spent": float(total_spent),
        "daily": daily,
        "category_summary": category_summary
    }


@router.get("/daily")
def daily_insights(
    on_date: Optional[date] = None,
    db: Session = Depends(get_db),
    limit: int = 100,
) -> Dict[str, Any]:
    """
    Returns transactions & totals for a specific date (defaults to today).
    """
    if on_date is None:
        on_date = date.today()

    start = datetime.combine(on_date, datetime.min.time())
    end = start + timedelta(days=1)

    total_spent = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.txn_time >= start, Transaction.txn_time < end)
        .scalar()
    )

    transactions = (
        db.query(Transaction)
        .filter(Transaction.txn_time >= start, Transaction.txn_time < end)
        .order_by(desc(Transaction.txn_time))
        .limit(limit)
        .all()
    )

    results = [
        {
            "id": str(t.id),
            "raw_text": t.raw_text,
            "amount": float(t.amount) if t.amount else None,
            "category": t.predicted_category,
            "receiver": t.receiver_name,
            "timestamp": t.txn_time,
            "confidence": float(t.confidence) if t.confidence else None
        }
        for t in transactions
    ]

    return {
        "date": str(on_date),
        "total_spent": float(total_spent),
        "transactions_count": len(results),
        "transactions": results
    }


@router.get("/trends")
def trends_insights(
    months: int = Query(6, ge=1, le=36),
    end_month: Optional[str] = None,  # "2025-11"
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Returns month-wise totals for the last `months` months.
    end_month format: "YYYY-MM" (defaults to current month)
    """
    if end_month:
        try:
            end_year, end_m = map(int, end_month.split("-"))
            end_date = date(end_year, end_m, 1)
        except:
            raise HTTPException(status_code=400, detail="Invalid end_month format (YYYY-MM)")
    else:
        today = date.today()
        end_date = date(today.year, today.month, 1)

    # Build months list (oldest -> newest)
    months_list = []
    current = end_date
    for _ in range(months):
        months_list.append(current)
        # move to previous month
        if current.month == 1:
            current = date(current.year - 1, 12, 1)
        else:
            current = date(current.year, current.month - 1, 1)
    months_list = list(reversed(months_list))

    results = []
    for m in months_list:
        # month start and next month start
        start = m
        if m.month == 12:
            next_m = date(m.year + 1, 1, 1)
        else:
            next_m = date(m.year, m.month + 1, 1)

        total = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(Transaction.txn_time >= start, Transaction.txn_time < next_m)
            .scalar()
        )
        results.append({"month": f"{m.year}-{m.month:02d}", "total": float(total)})

    return {"months": results}
