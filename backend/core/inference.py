"""
TransactAI Inference Pipeline
Loads the trained ML model + rules + preprocessing and performs
hybrid prediction using:
1. Rule-based classifier
2. ML classifier (LogisticRegression / SVC / LGBM)
3. Semantic matching (optional fallback)
"""

import joblib
import numpy as np
from pathlib import Path
from typing import Dict, List, Any

from .preprocessor import TransactionPreprocessor
from .rules import RuleBasedClassifier
from .semantic_matcher import SemanticMatcher


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"


class TransactionClassifier:
    """
    Main inference engine combining:
    - Preprocessor
    - Rule-based classifier
    - ML classifier
    - Semantic fallback
    """

    def __init__(self):
        print("[INFO] Initializing TransactAI inference pipeline...")

        # Load components
        self.preprocessor = TransactionPreprocessor()
        self.rule_engine = RuleBasedClassifier()

        # Load ML model
        ml_model_path = MODEL_DIR / "transaction_classifier.pkl"
        vectorizer_path = MODEL_DIR / "vectorizer.pkl"

        print("[INFO] Loading ML classifier:", ml_model_path)
        self.model = joblib.load(ml_model_path)
        print("[INFO] Loading vectorizer:", vectorizer_path)
        self.vectorizer = joblib.load(vectorizer_path)

        # Semantic matcher
        self.semantic = SemanticMatcher()

        print("[INFO] Inference pipeline initialized successfully.")

    # ----------------------------------------------------------
    # MAIN PREDICT METHOD
    # ----------------------------------------------------------
    def predict(self, raw_text: str) -> Dict[str, Any]:
        """
        Performs hybrid classification using:
        1) Rule-based patterns
        2) ML classifier
        3) Semantic similarity fallback
        """

        print(f"\n=== PREDICTION REQUEST ===")
        print("RAW:", raw_text)

        # 1. Clean input
        clean_text = self.preprocessor.clean(raw_text)
        print("CLEANED:", clean_text)

        # ----------------------------------------------------------
        # FIRST: Rule-based classifier
        # ----------------------------------------------------------
        rule_pred = self.rule_engine.classify(raw_text)
        if rule_pred:
            print("STRATEGY: RULES")
            return {
                "category": rule_pred,
                "strategy": "RULES",
                "ml_prob": None
            }

        # ----------------------------------------------------------
        # SECOND: ML classifier
        # ----------------------------------------------------------
        X = self.vectorizer.transform([clean_text])
        proba = self.model.predict_proba(X)[0]
        ml_pred = self.model.classes_[np.argmax(proba)]
        confidence = np.max(proba)

        print(f"STRATEGY: ML")
        print(f"ML PREDICTION: {ml_pred} (confidence={confidence:.2f})")

        # High confidence → return ML result directly
        if confidence >= 0.70:
            return {
                "category": ml_pred,
                "strategy": "ML",
                "ml_prob": float(confidence)
            }

        # ----------------------------------------------------------
        # THIRD: Semantic similarity fallback
        # ----------------------------------------------------------
        semantic_pred, score = self.semantic.match_category(clean_text)

        print(f"STRATEGY: SEMANTIC (fallback)")
        print(f"SEMANTIC PREDICTION: {semantic_pred} (score={score:.2f})")

        return {
            "category": semantic_pred,
            "strategy": "SEMANTIC",
            "ml_prob": float(confidence),
            "semantic_score": float(score)
        }
