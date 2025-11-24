# core/preprocessor.py

"""
Improved preprocessing utilities for transaction classification.
Includes:
- Strong amount extraction
- Accurate merchant/recipient extraction
- Clean text pipeline
- Noise removal
"""

import re
from typing import List, Optional


# ============================================================
# 1. AMOUNT EXTRACTION
# ============================================================

def extract_amount(text: str) -> Optional[float]:
    """
    Extract amount from transaction text.

    Supports:
    - ₹389
    - Rs 389
    - RS. 2,499.00
    - INR 1200
    - 1,20,000.50
    """

    pattern = r"(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)"
    matches = re.findall(pattern, text, flags=re.IGNORECASE)

    if not matches:
        return None

    amount = matches[0].replace(",", "")
    try:
        return float(amount)
    except:
        return None


# ============================================================
# 2. MERCHANT / RECIPIENT NAME CLEANUP
# ============================================================

def cleanup_merchant(name: str) -> str:
    """
    Removes unnecessary tokens from merchant names.
    """
    bad_words = ["google", "pay", "gpay", "upi", "using", "via", "gp"]
    parts = name.lower().split()

    cleaned = [p for p in parts if p not in bad_words]

    return " ".join(cleaned).strip()


# ============================================================
# 3. RECIPIENT EXTRACTION
# ============================================================

def extract_recipient(text: str) -> str:
    """
    Extract recipient or merchant name reliably.
    Handles phone numbers, UPI IDs, and merchant names.
    """
    t = text.lower().strip()
    credit_keywords = ["received", "credited", "deposit", "refunded", "reversed"]
    if any(word in text for word in credit_keywords):
        return "You"

    # ---------------------------
    # 1. Merchant name extraction
    # ---------------------------
    merchant_patterns = [
        r"paid to (.+?)(?: using| via| with|$)",
        r"paid at (.+?)(?: using| via| with|$)",
        r"sent to (.+?)(?: using| via| with|$)",
        r"received from (.+?)(?: using| via| with|$)",
        r"credited from (.+?)(?: using| via| with|$)",
    ]

    for pat in merchant_patterns:
        m = re.search(pat, t)
        if m:
            raw = m.group(1).strip()

            # Remove trailing common words
            remove_words = [
                "google pay",
                "gpay",
                "phonepe",
                "paytm",
                "upi",
                "transaction",
                "ref",
                "refno",
                "using",
                "via"
            ]
            for w in remove_words:
                raw = raw.replace(w, "").strip()

            # Keep only first 2 words for merchant names
            cleaned = " ".join(raw.split()[:2]).strip()
            return cleaned if cleaned else raw

    # ---------------------------
    # 2. Phone number (only if no merchant found)
    # ---------------------------
    phone = re.search(r"\b\d{10}\b", t)
    if phone:
        return phone.group(0)

    # ---------------------------
    # 3. UPI ID (very last)
    # ---------------------------
    upi = re.search(r"\b[\w\.-]+@[\w]+\b", t)
    if upi:
        return upi.group(0)

    return "Unknown"



# ============================================================
# 4. TEXT CLEANING PIPELINE FOR MODEL INPUT
# ============================================================

def clean_text_for_model(text: str) -> str:
    """
    Clean text for transformer model:
    - Lowercase
    - Remove punctuation
    - Remove app words
    - Keep useful tokens
    """

    t = text.lower()

    # Remove special characters
    t = re.sub(r"[^a-z0-9 ]", " ", t)

    # Remove noisy tokens
    noise = ["google", "pay", "gpay", "phonepe", "using", "via", "gp", "upi", "paytm"]
    for n in noise:
        t = t.replace(n, "")

    # Compress spaces
    t = re.sub(r"\s+", " ", t).strip()

    return t


# ============================================================
# MAIN CLEAN FUNCTION (Used in Dataset Training Only)
# ============================================================

class TransactionPreprocessor:
    """
    Backward-compatible preprocessor:
    - clean()           → old method
    - clean_text()      → new method expected by training code
    - clean_batch()     → batch processing, supports multithreading
    """

    # single text clean
    def clean(self, text: str) -> str:
        return clean_text_for_model(text)

    # alias for compatibility (training expects this)
    def clean_text(self, text: str) -> str:
        return clean_text_for_model(text)

    # batch clean with optional multithreading
    def clean_batch(self, texts: List[str], max_workers: int = 1):
        if max_workers <= 1:
            return [clean_text_for_model(t) for t in texts]

        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            return list(executor.map(clean_text_for_model, texts))

        return [clean_text_for_model(t) for t in texts]


# ============================================================
# TEST EXAMPLES
# ============================================================

if __name__ == "__main__":
    examples = [
        "₹389 paid to 8697704326 using Google Pay",
        "₹850 paid at McDonald's using Google Pay",
        "Rs. 1250 paid at FirstCry for kids essentials",
        "Sent ₹500 to Rahul Sharma via UPI"
    ]

    for e in examples:
        print("------")
        print("RAW:", e)
        print("AMOUNT:", extract_amount(e))
        print("RECIPIENT:", extract_recipient(e))
        print("CLEAN:", clean_text_for_model(e))
