"""Utility helpers for lightweight fuzzy matching."""

from typing import Iterable, Tuple

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover
    fuzz = None


def fuzzy_ratio(a: str, b: str) -> float:
    """Return normalized similarity ratio between two strings."""
    if not a or not b:
        return 0.0
    if fuzz is None:
        a = a.lower()
        b = b.lower()
        matches = sum(ch1 == ch2 for ch1, ch2 in zip(a, b))
        return matches / max(len(a), len(b))
    return fuzz.token_set_ratio(a, b) / 100.0


def fuzzy_contains(text: str, candidates: Iterable[str], threshold: float = 0.85) -> Tuple[bool, str]:
    """Check whether text fuzzily contains any candidate above threshold."""
    text = (text or "").lower()
    best_candidate = ""
    best_score = 0.0
    for cand in candidates:
        score = fuzzy_ratio(text, cand)
        if score > best_score:
            best_score = score
            best_candidate = cand
        if score >= threshold:
            return True, cand
    return False, best_candidate

