from fastapi import FastAPI, HTTPException, Depends, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
from psycopg2 import pool
import psycopg2, traceback, os
from dotenv import load_dotenv
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
import pandas as pd

# Core modules
from core.preprocessor import (
    clean_text_for_model,
    extract_amount,
    extract_recipient,
    TransactionPreprocessor
)

from core.inference import TransactionClassifier  # FIXED: use correct module

# Routers
from api.models import Transaction, Feedback
from api.db import get_db
from api.insights import router as insights_router
from api.budget import router as budget_router
from api.predict import router as predict_router   # Ensure prediction API is enabled

# Training integration
from training.train_model import train_with_feedback


# ============================================================
# Load environment variables
# ============================================================

load_dotenv()


# ============================================================
# FastAPI App
# ============================================================

app = FastAPI(
    title="TransactAI API",
    version="2.0",
    description="Smart Financial Transaction Categorization API + ML Retraining",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.1.100:3000",
        "https://your-frontend.vercel.app",
        "content://",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PostgreSQL Connection Pool (Legacy)
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
# Load ML Model on Startup
# ============================================================

processor = TransactionPreprocessor()

try:
    classifier = TransactionClassifier()  # loads models inside __init__()
    app.state.classifier = classifier
    print("✅ Classifier Loaded into app.state.classifier")
except Exception as e:
    print("❌ Failed to load classifier:", e)
    raise


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
# Root Endpoint
# ============================================================

@app.get("/")
def root():
    return {"status": "TransactAI API is running 🚀"}


# ============================================================
# Include Routers
# ============================================================

app.include_router(insights_router, prefix="/insights")
app.include_router(budget_router, prefix="/budget")
app.include_router(predict_router, prefix="/api")    # FIXED: Prediction endpoint enabled


# ============================================================
# Main Classification Endpoint
# ============================================================

@app.post("/classify")
def classify(payload: Dict, db: Session = Depends(get_db)):

    text = payload.get("message")
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'message' field")

    cleaned = clean_text_for_model(text)

    # Hybrid model classification
    result = app.state.classifier.predict(text)
    cat = result["category"]
    conf = result.get("ml_prob", 0.0)

    amount = extract_amount(text)
    receiver = extract_recipient(text)
    txn_time = datetime.now()

    # Save only if confidence is good
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

    # Low confidence → Ask user
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

    # Save transaction + feedback for retraining
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
# Add New Category
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

    category_data = (
        db.query(Transaction.predicted_category, func.sum(Transaction.amount))
        .group_by(Transaction.predicted_category)
        .all()
    )

    category_summary = {cat: float(value or 0.0) for cat, value in category_data}

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
# Legacy Feedback API (Psycopg2)
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

        cursor.execute(
            sql,
            (data.user_id, data.raw_text, data.predicted, data.corrected, data.confidence),
        )

        conn.commit()
        cursor.close()
        db_pool.putconn(conn)

        return {"status": "success", "message": "feedback stored ✔"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Retraining Endpoint
# ============================================================

@app.post("/retrain-model")
def retrain_model(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):

    rows = db.query(Feedback).all()
    if not rows:
        return {"status": "no_feedback", "message": "No feedback rows found; skipping retrain."}

    # Build dataframe
    records = [{"Description": r.message, "Category": r.chosen_category} for r in rows]
    feedback_df = pd.DataFrame(records)

    def _worker(df):
        try:
            print("[RETRAIN] started with:", len(df), "records")
            train_with_feedback(df)
            print("[RETRAIN] Training complete")

            # Reload classifier
            new_clf = TransactionClassifier()
            app.state.classifier = new_clf
            print("[RETRAIN] Model reloaded")
        except Exception as e:
            print("[RETRAIN] Error:", e)

    background_tasks.add_task(_worker, feedback_df)

    return {"status": "accepted", "message": "Retraining started in background"}


# ============================================================
# Startup Scheduler
# ============================================================

from api.scheduler import run_nightly_retrain

@app.on_event("startup")
def start_scheduler():
    try:
        run_nightly_retrain(app, hour=3, minute=0)
    except Exception as e:
        print("Failed to start nightly scheduler:", e)

