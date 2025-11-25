import re
from typing import List, Optional


# ============================================================
# 1. AMOUNT EXTRACTION (BANK-GRADE)
# ============================================================

def extract_amount(text: str) -> Optional[float]:
    """
    Extracts amounts like:
    - ₹450
    - Rs 1,20,000
    - 499.50
    - INR 300
    """
    patterns = [
        r"(?:₹|rs\.?|inr|rupay)?\s*([\d,]{1,9}(?:\.\d{1,2})?)",
    ]

    for p in patterns:
        match = re.findall(p, text, flags=re.IGNORECASE)
        if match:
            amt = match[0].replace(",", "")
            try:
                return float(amt)
            except:
                return None

    return None


# ============================================================
# 2. MERCHANT CLEANUP
# ============================================================

BAD_TOKENS = {
    "google", "pay", "gpay", "gp", "upi", "phonepe", "paytm",
    "using", "via", "transaction", "ref", "refno", "id", "from"
}

def cleanup_merchant(name: str) -> str:
    parts = name.lower().split()
    filtered = [p for p in parts if p not in BAD_TOKENS]
    return " ".join(filtered).strip()


# ============================================================
# 3. ADVANCED MERCHANT / RECIPIENT EXTRACTION
# ============================================================

MERCHANT_PATTERNS = [
    r"paid to (.+?)(?: using| via| with| for|\.|$)",
    r"paid at (.+?)(?: using| via| with| for|\.|$)",
    r"sent to (.+?)(?: using| via| with| for|\.|$)",
    r"transfer to (.+?)(?: using| via| with| for|\.|$)",
    r"payment to (.+?)(?: using| via| with| for|\.|$)",
    r"payment done to (.+?)(?: using| via| with| for|\.|$)",
    r"purchased from (.+?)(?: using| via| with| for|\.|$)",
    r"bought from (.+?)(?: using| via| with| for|\.|$)",
    r"rs\s+[\d,]+\.?\d*\s+(?:paid|sent|transfer|payment)\s+to\s+(.+?)(?: using| via| with| for|\.|$)",
    r"rs\s+[\d,]+\.?\d*\s+(?:paid|sent|transfer|payment)\s+at\s+(.+?)(?: using| via| with| for|\.|$)",
]

CREDIT_WORDS = ["credited", "received", "refunded", "reversed", "deposit"]


def extract_recipient(text: str) -> str:
    t = text.lower().strip()

    # Incoming money → You
    if any(k in t for k in CREDIT_WORDS):
        return "You"

    # ----------------------------------------
    # Pattern-based extraction (TOP PRIORITY)
    # ----------------------------------------
    for pat in MERCHANT_PATTERNS:
        m = re.search(pat, t)
        if m:
            merchant = cleanup_merchant(m.group(1).strip())
            merchant = re.sub(r"\s+", " ", merchant)

            # Keep only top 2 words
            merchant = " ".join(merchant.split()[:2])

            if merchant:
                return merchant

    # ----------------------------------------
    # UPI ID fallback (@oksbi @ybl @upi etc)
    # ----------------------------------------
    upi = re.search(r"\b[\w\.-]+@[\w]+\b", t)
    if upi:
        return upi.group(0)

    # ----------------------------------------
    # 10-digit phone fallback
    # ----------------------------------------
    phone = re.search(r"\b\d{10}\b", t)
    if phone:
        return phone.group(0)

    return "Unknown"


# ============================================================
# 4. SEMANTIC CATEGORY BOOSTING (HUGE ML ACCURACY IMPROVEMENT)
# ============================================================

CATEGORY_HINTS = {
    "shopping": ["amazon", "flipkart", "myntra", "ajio", "meesho", "shop", "firstcry", "shopping", "purchase", "buy"],
    "food": ["swiggy", "zomato", "restaurant", "pizza", "burger", "kfc", "mcd", "mcdonalds", "food", "order"],
    "fuel": ["petrol", "fuel", "diesel", "hpcl", "bpcl", "indianoil", "ioc"],
    "grocery": ["bigbasket", "dmart", "grocery", "mart", "grofers", "grocery"],
    "bills": ["electricity", "water", "recharge", "postpaid", "bill", "mobile"],
    "subscription": ["prime", "netflix", "spotify", "membership", "renew", "subscription"],
    "transport": ["uber", "ola", "auto", "cab", "metro", "train", "taxi", "ride"],
    "salary": ["salary", "payout", "credited"],
}


def semantic_boost(t: str) -> str:
    """Adds semantic tokens to improve ML accuracy."""
    boost = []
    for cat, words in CATEGORY_HINTS.items():
        if any(w in t for w in words):
            boost.append(cat)
    return " ".join(boost)


# ============================================================
# 5. CORE MODEL CLEANING — BANKING GRADE
# ============================================================

NOISE = {
    "google", "gpay", "upi", "phonepe", "paytm",
    "using", "via", "transaction", "ref", "gp",
    "debited", "credited"
}

def clean_text_for_model(text: str) -> str:
    t = text.lower()

    # Remove special chars
    t = re.sub(r"[^a-z0-9 ]", " ", t)

    # Remove noise tokens
    for n in NOISE:
        t = t.replace(n, "")

    # Collapse spacing
    t = re.sub(r"\s+", " ", t).strip()

    # Add semantic category hints
    boost = semantic_boost(t)
    if boost:
        t = f"{t} {boost}"

    return t


# ============================================================
# 6. MAIN PREPROCESSOR CLASS
# ============================================================

class TransactionPreprocessor:
    def clean(self, text: str) -> str:
        return clean_text_for_model(text)

    def clean_text(self, text: str) -> str:
        return clean_text_for_model(text)

    def clean_batch(self, texts: List[str], max_workers: Optional[int] = None):
        """
        Clean a batch of texts. Supports optional max_workers for parallel processing.
        If max_workers is None or <= 1, processes sequentially.
        """
        if max_workers is None or max_workers <= 1:
            return [clean_text_for_model(t) for t in texts]

        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            return list(ex.map(clean_text_for_model, texts))


# ============================================================
# 7. SELF-TEST
# ============================================================

if __name__ == "__main__":
    samples = [
        "Rs 4000 paid to Amazon via GPay",
        "₹850 paid at McDonald's using Google Pay",
        "Sent ₹500 to Rahul Sharma via UPI",
        "Rs 2500 bought from Flipkart using PhonePe",
        "Payment of ₹1299 made to Netflix",
        "₹399 credited to your account from Bank",
    ]

    for s in samples:
        print("\n---")
        print("RAW:", s)
        print("AMOUNT:", extract_amount(s))
        print("RECIPIENT:", extract_recipient(s))
        print("CLEAN:", clean_text_for_model(s))
