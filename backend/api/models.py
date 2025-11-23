# api/models.py

from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .db import Base


# ============================================================
# 1. TRANSACTION TABLE (Primary storage)
# ============================================================

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    user = relationship("User")

    # Raw text from notification
    raw_text = Column(Text, nullable=False)

    # Cleaned text used for model input
    clean_text = Column(Text, nullable=True)

    # Extracted amount
    amount = Column(Numeric(12, 2), nullable=True)

    # User always the sender
    sender_name = Column(String(100), default="You")
    sender_phone = Column(String(20), nullable=True)

    # Merchant / mobile number (receiver)
    receiver_name = Column(String(255), nullable=True)
    receiver_phone = Column(String(20), nullable=True)

    # Extracted or current timestamp
    txn_time = Column(DateTime, nullable=True)

    # Model output
    predicted_category = Column(String(100), nullable=True)
    confidence = Column(Numeric(5, 3), nullable=True)

    # Source of transaction (mobile app)
    source = Column(String(20), default="mobile")

    # Auto timestamp of insertion
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ============================================================
# 2. FEEDBACK TABLE (For retraining the model)
# ============================================================

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Original incoming text
    message = Column(Text, nullable=False)

    # Cleaned text that training pipeline will use
    clean_text = Column(Text, nullable=True)

    # Extracted numeric amount
    amount = Column(Numeric(12, 2), nullable=True)

    # Merchant/receiver extracted
    receiver_name = Column(String(255), nullable=True)

    # User-selected correct category
    chosen_category = Column(String(100), nullable=False)

    # Auto timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    gender = Column(String(20), nullable=True)
    email = Column(String(200), unique=True, nullable=True)
    phone = Column(String(15), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())