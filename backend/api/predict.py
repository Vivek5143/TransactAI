from fastapi import APIRouter
from pydantic import BaseModel
from core.inference import TransactionClassifier

router = APIRouter()
classifier = TransactionClassifier()

class PredictRequest(BaseModel):
    text: str

@router.post("/predict")
def predict(req: PredictRequest):
    result = classifier.predict(req.text)
    return result
