from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

class PredictRequest(BaseModel):
    text: str

@router.post("/predict")
def predict(req: PredictRequest, request: Request):
    """
    Prediction endpoint. Requires classifier to be loaded in app.state.classifier.
    """
    if not hasattr(request.app.state, 'classifier') or request.app.state.classifier is None:
        raise HTTPException(
            status_code=503,
            detail="Classifier not loaded. Please train the model first."
        )
    
    try:
        result = request.app.state.classifier.predict(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
