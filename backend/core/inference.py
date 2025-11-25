"""
TransactAI Inference Pipeline
Loads the trained DistilBERT model from core/model.py and performs
hybrid prediction using:
1. Rule-based classifier
2. DistilBERT transformer model
3. Sentence transformer embeddings (fallback)
"""

from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from .preprocessor import TransactionPreprocessor
from .model import TransactionClassifier as ModelTransactionClassifier


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"


class TransactionClassifier:
    """
    Main inference engine that wraps the DistilBERT-based TransactionClassifier
    from core/model.py. This provides a consistent interface for the API.
    """

    def __init__(self, model_dir: Optional[str] = None):
        """
        Initialize the classifier. Tries to load a saved model, or creates
        an uninitialized classifier if no model exists yet.
        """
        print("[INFO] Initializing TransactAI inference pipeline...")

        self.preprocessor = TransactionPreprocessor()
        self.classifier = ModelTransactionClassifier()

        # Try to load saved model
        model_path = Path(model_dir) if model_dir else MODEL_DIR / "classifier"
        
        if model_path.exists():
            try:
                print(f"[INFO] Loading saved model from: {model_path}")
                self.classifier.load(dir_path=str(model_path.parent), name=model_path.name)
                print("[INFO] Model loaded successfully.")
            except Exception as e:
                print(f"[WARN] Failed to load saved model: {e}")
                print("[WARN] Classifier will need to be trained before use.")
        else:
            print(f"[WARN] Model directory not found: {model_path}")
            print("[WARN] Classifier will need to be trained before use.")

        print("[INFO] Inference pipeline initialized.")

    def predict(self, raw_text: str, clean_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Performs hybrid classification using:
        1) Rule-based patterns
        2) DistilBERT transformer
        3) Sentence transformer embeddings (fallback)

        Returns:
            Dict with keys: category, confidence, strategy, metadata
        """
        if self.classifier.model is None or self.classifier.tokenizer is None:
            # Fallback to rule-based only if model not loaded
            from .rules import RuleEngine
            rule_engine = RuleEngine()
            match = rule_engine.evaluate(raw_text, clean_text, min_confidence=0.5)
            if match:
                return {
                    "category": match.category,
                    "confidence": float(match.confidence),
                    "strategy": "RULE",
                    "ml_prob": None,
                }
            return {
                "category": "Others",
                "confidence": 0.35,
                "strategy": "FALLBACK",
                "ml_prob": None,
            }

        # Use the model's predict method
        category, confidence, metadata = self.classifier.predict(raw_text, clean_text)
        
        return {
            "category": category,
            "confidence": float(confidence),
            "strategy": metadata.get("strategy", "ML"),
            "ml_prob": float(confidence),
            "metadata": metadata,
        }

    def predict_batch(
        self, raw_texts: list[str], clean_texts: Optional[list[Optional[str]]] = None
    ) -> list[Dict[str, Any]]:
        """
        Predict categories for a batch of texts.
        """
        if self.classifier.model is None or self.classifier.tokenizer is None:
            # Fallback to rule-based only
            from .rules import RuleEngine
            rule_engine = RuleEngine()
            results = []
            for raw_text in raw_texts:
                match = rule_engine.evaluate(raw_text, None, min_confidence=0.5)
                if match:
                    results.append({
                        "category": match.category,
                        "confidence": float(match.confidence),
                        "strategy": "RULE",
                        "ml_prob": None,
                    })
                else:
                    results.append({
                        "category": "Others",
                        "confidence": 0.35,
                        "strategy": "FALLBACK",
                        "ml_prob": None,
                    })
            return results

        # Use the model's predict_batch method
        batch_results = self.classifier.predict_batch(raw_texts, clean_texts)
        
        return [
            {
                "category": category,
                "confidence": float(confidence),
                "strategy": metadata.get("strategy", "ML"),
                "ml_prob": float(confidence),
                "metadata": metadata,
            }
            for category, confidence, metadata in batch_results
        ]
