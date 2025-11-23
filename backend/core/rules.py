# core/rules.py

"""
Lightweight rule engine that short-circuits obvious categories before the
transformer is invoked. The engine is deterministic and easily auditable.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional, Tuple

from core.fuzzy_utils import fuzzy_contains


RULE_CONFIG: Dict[str, Dict] = {
    "Fuel": {
        "keywords": ["petrol", "diesel", "pump", "fuel", "hpcl", "bpcl", "indianoil", "ioc"],
        "patterns": [r"\bpetrol pump\b", r"\bfuel station\b"],
        "fuzzy": ["petrol bunk", "fuel pump", "gas station"],
        "fuzzy_weight": 1.2,
        "confidence_norm": 3.0,
    },
    "Travel": {
        "keywords": ["uber", "ola", "rapido", "cab", "bus", "metro", "flight", "train", "ticket"],
        "patterns": [r"\bflight ticket\b", r"\brail(ticket)?\b", r"\bmetro recharge\b"],
        "fuzzy": ["ola cab", "uber trip"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 4.0,
    },
    "Food": {
        "keywords": ["zomato", "swiggy", "dominos", "pizza", "restaurant", "hotel", "tiffin", "caf"],
        "patterns": [r"\bfood order\b", r"\bhotel booking\b"],
        "fuzzy": ["restaurent", "restro", "resto"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 3.5,
    },
    "Bills": {
        "keywords": ["electricity", "power", "bill", "recharge", "phonepe", "phone bill", "gas", "water"],
        "patterns": [r"\belectricity bill\b", r"\bmobile recharge\b", r"\bdth recharge\b"],
        "fuzzy": ["electric bill", "elec bill"],
        "fuzzy_weight": 1.1,
        "confidence_norm": 4.0,
    },
    "Shopping": {
        "keywords": ["amazon", "flipkart", "myntra", "ajio", "dmart", "bigbasket", "mall", "store"],
        "patterns": [r"\bqr purchase\b", r"\bpos purchase\b"],
        "fuzzy": ["amazn", "flip cart"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 3.5,
    },
    "Healthcare": {
        "keywords": ["hospital", "clinic", "doctor", "pharmacy", "medplus", "lab test"],
        "patterns": [r"\bmedical bill\b", r"\bhospital bill\b"],
        "fuzzy": ["hosp", "medic"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 3.0,
    },
    "Education": {
        "keywords": ["school", "college", "tuition", "fees", "university", "coaching"],
        "patterns": [r"\btuition fee\b", r"\bexam fee\b"],
        "fuzzy": ["tution", "scl fees"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 3.0,
    },
    "Entertainment": {
        "keywords": ["netflix", "spotify", "movie", "ticketnew", "bookmyshow", "gaming", "psn"],
        "patterns": [r"\bmovie ticket\b", r"\bconcert\b"],
        "fuzzy": ["bookmy show", "sony liv"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 3.0,
    },
    "Fund Transfer": {
        "keywords": ["sent to", "transfer", "gpay", "phonepe", "paytm", "upi", "imps", "neft"],
        "patterns": [r"\bsent to\b", r"\bto mom\b", r"\btransfer to\b"],
        "fuzzy": ["fund transf", "money sent"],
        "fuzzy_weight": 1.2,
        "confidence_norm": 4.0,
    },
    "Cashback": {
        "keywords": ["cashback", "reward", "offer", "refunded", "credited back"],
        "patterns": [r"\bcash ?back\b", r"\brefunded\b"],
        "fuzzy": [],
        "fuzzy_weight": 0.8,
        "confidence_norm": 2.0,
    },
    "EMI": {
        "keywords": ["emi", "installment", "loan repayment", "equated"],
        "patterns": [r"\bloan emi\b", r"\bemi due\b"],
        "fuzzy": ["instalment", "auto-debit emi"],
        "fuzzy_weight": 1.3,
        "confidence_norm": 2.5,
    },
    "Interest": {
        "keywords": ["interest credited", "interest earned", "interest payout", "credit interest"],
        "patterns": [r"\binterest (?:credited|earned)\b"],
        "fuzzy": [],
        "fuzzy_weight": 1.0,
        "confidence_norm": 2.5,
    },
    "ATM Withdrawal": {
        "keywords": ["atm withdrawal", "atm cash", "cash withdrawal", "pos withdrawal"],
        "patterns": [r"\batm\b", r"\bpos\b", r"\bcash w/d\b"],
        "fuzzy": ["atm wd", "atm cash wd"],
        "fuzzy_weight": 1.2,
        "confidence_norm": 3.0,
    },
    "Refund": {
        "keywords": ["reversal", "refund", "chargeback", "reversed", "refunded"],
        "patterns": [r"\btransaction reversed\b", r"\btxn reversal\b"],
        "fuzzy": ["refund issued", "amount reversed"],
        "fuzzy_weight": 1.0,
        "confidence_norm": 2.5,
    },
}


@dataclass
class RuleMatch:
    category: str
    confidence: float
    matched_terms: List[str]
    score: float

    def to_dict(self) -> Dict[str, object]:
        return asdict(self)


def _score_category(text: str, config: Dict) -> Tuple[float, List[str]]:
    score = 0.0
    matches: List[str] = []
    for kw in config.get("keywords", []):
        if kw in text:
            score += 1.0
            matches.append(kw)
    for pattern in config.get("patterns", []):
        if re.search(pattern, text):
            score += 1.5
            matches.append(pattern)
    if config.get("fuzzy"):
        found, term = fuzzy_contains(text, config["fuzzy"])
        if found:
            score += config.get("fuzzy_weight", 1.0)
            matches.append(term)
    return score, matches


class RuleEngine:
    """Encapsulates deterministic heuristics with reusable configuration."""

    def __init__(self, config: Optional[Dict[str, Dict]] = None):
        self.config = config or RULE_CONFIG

    def evaluate(
        self,
        raw_text: Optional[str],
        clean_text: Optional[str] = None,
        min_confidence: float = 0.0,
    ) -> Optional[RuleMatch]:
        texts: List[str] = []
        if raw_text:
            texts.append(raw_text.lower())
        if clean_text:
            lowered = clean_text.lower()
            if lowered not in texts:
                texts.append(lowered)

        best_category: Optional[str] = None
        best_score = 0.0
        best_matches: List[str] = []
        norm = 1.0

        for text in texts:
            for category, cfg in self.config.items():
                score, matches = _score_category(text, cfg)
                if score > best_score:
                    best_category = category
                    best_score = score
                    best_matches = matches
                    norm = cfg.get("confidence_norm", 3.0)

        if not best_category or best_score == 0:
            return None

        confidence = min(best_score / norm, 1.0)
        if confidence < min_confidence:
            return None

        return RuleMatch(
            category=best_category,
            confidence=confidence,
            matched_terms=best_matches,
            score=best_score,
        )


def rule_based_category(
    raw_text: Optional[str],
    clean_text: Optional[str] = None,
    min_confidence: float = 0.0,
) -> Optional[Dict[str, object]]:
    """
    Backwards-compatible helper that mirrors the old functional interface.
    """

    match = RuleEngine().evaluate(raw_text, clean_text, min_confidence=min_confidence)
    return match.to_dict() if match else None
