# api/budget.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import date
from api.db import get_db, engine
from api.models import Transaction

router = APIRouter()

# Ensure budgets table exists
with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS budgets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            year INT NOT NULL,
            month INT NOT NULL,
            category VARCHAR(100) NOT NULL,
            amount NUMERIC(12,2) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(year, month, category)
        );
    """))


class BudgetSetRequest(BaseModel):
    year: int
    month: int
    category: str
    amount: float


class BudgetStatusResponse(BaseModel):
    year: int
    month: int
    category: str
    budget_amount: float
    spent: float
    remaining: float


@router.post("/set")
def set_budget(payload: BudgetSetRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Set or update budget for (year, month, category)
    """
    # Upsert style using plain SQL for simplicity
    try:
        sql = text("""
            INSERT INTO budgets (year, month, category, amount)
            VALUES (:year, :month, :category, :amount)
            ON CONFLICT (year, month, category)
            DO UPDATE SET amount = EXCLUDED.amount;
        """)
        db.execute(sql, {
            "year": payload.year,
            "month": payload.month,
            "category": payload.category,
            "amount": payload.amount
        })
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok", "year": payload.year, "month": payload.month, "category": payload.category, "amount": payload.amount}


@router.get("/status")
def budget_status(year: int, month: int, category: Optional[str] = None, db: Session = Depends(get_db)) -> Any:
    """
    Returns budget vs spent for a month (and optionally a category).
    """
    start = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)

    # spent in month (optionally category)
    q = db.query(func.coalesce(func.sum(Transaction.amount), 0))
    q = q.filter(Transaction.txn_time >= start, Transaction.txn_time < next_month)
    if category:
        q = q.filter(Transaction.predicted_category == category)
    spent = float(q.scalar() or 0.0)

    if category:
        row = db.execute(text("SELECT amount FROM budgets WHERE year=:y AND month=:m AND category=:c"), {"y": year, "m": month, "c": category}).fetchone()
        budget_amount = float(row[0]) if row else 0.0
        remaining = budget_amount - spent
        return {
            "year": year,
            "month": month,
            "category": category,
            "budget_amount": budget_amount,
            "spent": spent,
            "remaining": remaining
        }

    # if no category provided, return summary for all budgets for that month
    rows = db.execute(text("SELECT category, amount FROM budgets WHERE year=:y AND month=:m"), {"y": year, "m": month}).fetchall()
    results = []
    for r in rows:
        cat = r[0]
        budget_amount = float(r[1])
        q = db.query(func.coalesce(func.sum(Transaction.amount), 0))
        q = q.filter(Transaction.txn_time >= start, Transaction.txn_time < next_month)
        q = q.filter(Transaction.predicted_category == cat)
        spent_cat = float(q.scalar() or 0.0)
        results.append({
            "category": cat,
            "budget_amount": budget_amount,
            "spent": spent_cat,
            "remaining": budget_amount - spent_cat
        })

    return {"year": year, "month": month, "budgets": results}


@router.post("/reset")
def reset_budget(year: int, month: int, category: Optional[str] = None):
    """
    Reset (delete) budget entries for the month or for (month+category).
    """
    try:
        if category:
            with engine.begin() as conn:
                conn.execute(text("DELETE FROM budgets WHERE year=:y AND month=:m AND category=:c"), {"y": year, "m": month, "c": category})
        else:
            with engine.begin() as conn:
                conn.execute(text("DELETE FROM budgets WHERE year=:y AND month=:m"), {"y": year, "m": month})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "ok"}
