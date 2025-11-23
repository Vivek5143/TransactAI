# api/crud.py
from .models import Transaction
from sqlalchemy.orm import Session
from .schemas import TransactionCreate

def save_transaction(db: Session, data: TransactionCreate):
    txn = Transaction(**data.dict())
    db.add(txn)
    db.commit()
    db.refresh(txn)  
    return txn
