# api/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TransactionCreate(BaseModel):
    raw_text: str
    clean_text: Optional[str]
    amount: Optional[float]
    sender_name: Optional[str]
    receiver_name: Optional[str]
    sender_phone: Optional[str]
    receiver_phone: Optional[str]
    txn_time: Optional[datetime]
    predicted_category: Optional[str]
    confidence: Optional[float]
    source: Optional[str] = "mobile"


class TransactionResponse(TransactionCreate):
    id: str
    created_at: datetime

    class Config:
        orm_mode = True
