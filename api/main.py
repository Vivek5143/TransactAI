from fastapi import FastAPI, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict
from psycopg2 import pool
import psycopg2, traceback, os
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
import pandas as pd

# Import improved preprocessors
from core.preprocessor import (
    clean_text_for_model,
    extract_amount,
    extract_recipient,
    TransactionPreprocessor,
)

from core.model import TransactionClassifier
from api.models import Transaction, Feedback
from api.db import get_db
from api.insights import router as insights_router
from api.budget import router as budget_router
from api.scheduler import run_nightly_retrain

# training integration
from training.train_model import train_with_feedback


# Load env
load_dotenv()

app = FastAPI(
    title="TransactAI API",
    version="2.0",
    description="Smart Transaction Categorization + Feedback System",
)
app.include_router(insights_router, prefix="/insights")
app.include_router(budget_router, prefix="/budget")
# ============================================================
# PostgreSQL Connection Pool (only for legacy feedback endpoint)
# ============================================================

try:
    db_pool = psycopg2.pool.SimpleConnectionPool(
        1,
        10,
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
    )
    print("✅ PostgreSQL Connection Pool Established")
except Exception as e:
    print("❌ DB Pool Error:", e)
    raise

# ============================================================
# Load ML Model
# ============================================================

processor = TransactionPreprocessor()
# Initialize classifier and attach to app.state for global reload access
initial_classifier = TransactionClassifier()
initial_classifier.load(dir_path="models", name="classifier")
app.state.classifier = initial_classifier


# ============================================================
# Categories
# ============================================================

CATEGORIES = [
    "Food",
    "Grocery",
    "Fuel",
    "Shopping",
    "Medical",
    "Bills",
    "Transport",
    "Refund",
    "Salary",
    "Subscription",
    "UPI_Transfer",
]

# ============================================================
# Schemas
# ============================================================

class ClassificationRequest(BaseModel):
    text: str


class ManualCategoryRequest(BaseModel):
    message: str
    category: str
    amount: Optional[float]
    receiver: Optional[str]
    clean_text: Optional[str]


class FeedbackModel(BaseModel):
    user_id: Optional[str] = None
    raw_text: str
    predicted: str
    corrected: str
    confidence: float


# ============================================================
# Root
# ============================================================

@app.get("/")
def root():
    return {"status": "TransactAI API is running 🚀"}


# ============================================================
# Classify
# ============================================================

@app.post("/classify")
def classify(payload: Dict, db: Session = Depends(get_db)):

    text = payload.get("message")
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'message' field")

    cleaned = clean_text_for_model(text)
    cat, conf, meta = app.state.classifier.predict(text)

    amount = extract_amount(text)
    receiver = extract_recipient(text)
    txn_time = datetime.now()
    
    if conf >= 0.6:
        txn = Transaction(
            raw_text=text,
            clean_text=cleaned,
            amount=amount,
            sender_name="You",
            receiver_name=receiver,
            txn_time=txn_time,
            predicted_category=cat,
            confidence=float(conf),
            source="mobile",
        )
        db.add(txn)
        db.commit()

        return {
            "status": "saved",
            "category": cat,
            "confidence": float(conf),
            "amount": amount,
            "receiver": receiver,
        }

    return {
        "status": "low_confidence",
        "confidence": float(conf),
        "options": CATEGORIES,
        "allow_new_category": True,
        "amount": amount,
        "receiver": receiver,
        "clean_text": cleaned,
        "raw_text": text,
    }

# ============================================================
# Manual Category Selection
# ============================================================

@app.post("/manual-category")
def manual_category(request: ManualCategoryRequest, db: Session = Depends(get_db)):

    if not request.message or not request.category:
        raise HTTPException(status_code=400, detail="Missing required fields")

    txn = Transaction(
        raw_text=request.message,
        clean_text=request.clean_text,
        amount=request.amount,
        sender_name="You",
        receiver_name=request.receiver,
        txn_time=datetime.now(),
        predicted_category=request.category,
        confidence=0.0,
        source="mobile",
    )

    feedback_row = Feedback(
        message=request.message,
        clean_text=request.clean_text,
        amount=request.amount,
        receiver_name=request.receiver,
        chosen_category=request.category,
    )

    try:
        db.add(txn)
        db.add(feedback_row)
        db.commit()
    except Exception as e:
        db.rollback()
        print("❌ Feedback Insert Error:", e)
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    return {"status": "saved_with_feedback", "category": request.category}


# ============================================================
# Add Category
# ============================================================

@app.post("/add-category")
def add_category(payload: Dict):

    new_cat = payload.get("category", "").strip()
    if not new_cat:
        raise HTTPException(status_code=400, detail="Category missing")

    if new_cat not in CATEGORIES:
        CATEGORIES.append(new_cat)

    return {"status": "added", "categories": CATEGORIES}


# ============================================================
# Transactions List
# ============================================================

@app.get("/transactions")
def get_transactions(
    category: Optional[str] = None,
    receiver: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)

    if category:
        query = query.filter(Transaction.predicted_category == category)

    if receiver:
        query = query.filter(Transaction.receiver_name.ilike(f"%{receiver}%"))

    if min_amount:
        query = query.filter(Transaction.amount >= min_amount)

    if max_amount:
        query = query.filter(Transaction.amount <= max_amount)

    query = query.order_by(asc(Transaction.txn_time) if sort == "asc" else desc(Transaction.txn_time))

    rows = query.offset(offset).limit(limit).all()

    return {
        "count": len(rows),
        "results": [
            {
                "id": str(t.id),
                "raw_text": t.raw_text,
                "amount": float(t.amount) if t.amount else None,
                "category": t.predicted_category,
                "receiver": t.receiver_name,
                "timestamp": t.txn_time,
                "confidence": float(t.confidence) if t.confidence else None,
            }
            for t in rows
        ],
    }


# ============================================================
# Summary Analytics
# ============================================================

@app.get("/summary")
def get_summary(db: Session = Depends(get_db)):

    total_spent = db.query(func.sum(Transaction.amount)).scalar() or 0
    total_transactions = db.query(func.count(Transaction.id)).scalar()

    category_data = db.query(Transaction.predicted_category, func.sum(Transaction.amount)).group_by(Transaction.predicted_category).all()

    category_summary = {row[0]: float(row[1]) if row[1] else 0.0 for row in category_data}

    latest = db.query(Transaction).order_by(desc(Transaction.txn_time)).first()
    latest_txn = None

    if latest:
        latest_txn = {
            "id": str(latest.id),
            "amount": float(latest.amount) if latest.amount else None,
            "category": latest.predicted_category,
            "receiver": latest.receiver_name,
            "timestamp": latest.txn_time,
        }

    highest_category = max(category_summary, key=category_summary.get) if category_summary else None

    return {
        "total_spent": float(total_spent),
        "total_transactions": total_transactions,
        "category_summary": category_summary,
        "highest_spending_category": highest_category,
        "latest_transaction": latest_txn,
    }


# ============================================================
# Legacy Psycopg2 Feedback API
# ============================================================

@app.post("/feedback")
def feedback(data: FeedbackModel):
    try:
        conn = db_pool.getconn()
        cursor = conn.cursor()

        sql = """
            INSERT INTO transaction_feedback
            (user_id, original_text, predicted_category, corrected_category, confidence)
            VALUES (%s, %s, %s, %s, %s)
        """

        cursor.execute(sql, (data.user_id, data.raw_text, data.predicted, data.corrected, data.confidence))

        conn.commit()
        cursor.close()
        db_pool.putconn(conn)

        return {"status": "success", "message": "feedback stored ✔"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/retrain-model")
def retrain_model(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Trigger model retraining using all rows from `feedback` table.
    This runs in background and immediately returns a 202 Accepted response.
    """

    # Read feedback rows from DB
    rows = db.query(Feedback).all()
    if not rows:
        return {"status": "no_feedback", "message": "No feedback rows found; skipping retrain."}

    # Convert to DataFrame in the exact format expected by training
    records = []
    for r in rows:
        records.append({"Description": (r.message or ""), "Category": (r.chosen_category or "")})
    feedback_df = pd.DataFrame.from_records(records)

    # Background worker: run training with feedback, then reload classifier
    def _worker(df):
        try:
            print("[RETRAIN] started background retraining with feedback rows:", len(df))
            res = train_with_feedback(df)
            print("[RETRAIN] finished training:", res)
            # reload classifier in-app
            try:
                new_clf = TransactionClassifier()
                new_clf.load(dir_path="models", name="classifier")
                app.state.classifier = new_clf
                print("[RETRAIN] model reloaded into app.state.classifier")
            except Exception as e:
                print("[RETRAIN] failed to reload classifier into app.state:", e)
        except Exception as e:
            print("[RETRAIN] Retraining failed:", e)

    # schedule background task (non-blocking)
    background_tasks.add_task(_worker, feedback_df)

    return {"status": "accepted", "message": "Retraining started in background"}


# ============================================================
# Start scheduled nightly retrain on startup
# ============================================================

@app.on_event("startup")
def start_scheduler():
    try:
        run_nightly_retrain(app, hour=3, minute=0)
    except Exception as e:
        print("Failed to start nightly scheduler:", e)
