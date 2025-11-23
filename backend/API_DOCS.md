
# 📘 TransactAI – API Documentation

Base URL:
http://localhost:8000

---

### 🔍 **POST /classify — Classify a transaction notification**

#### **Request**
```json
{
  "message": "₹389 paid to 8636987542 using Google Pay"
}
```
#### Response (High Confidence)
```
{
  "status": "saved",
  "category": "Food",
  "confidence": 0.92,
  "amount": 389.0,
  "receiver": "8636987542"
}
```
#### Response (Low Confidence)
```
{
  "status": "low_confidence",
  "confidence": 0.34,
  "options": ["Food", "Fuel", "Bills", "..."],
  "allow_new_category": true,
  "clean_text": "389 paid google pay",
  "raw_text": "₹389 paid to 8636987542 using Google Pay"
}
```
### 📝 POST /manual-category — Manual category correction
### Request
```
{
  "message": "₹389 paid to 8636987542 using Google Pay",
  "category": "Friend",
  "amount": 389.0,
  "receiver": "8636987542",
  "clean_text": "amounttoken paid google pay"
}
```
#### Response
```
{
  "status": "saved_with_feedback",
  "category": "Friend"
}
```
### ➕ POST /add-category — Add a new user-defined category
#### Request
```
{
  "category": "Pet Care"
}
```
#### Response
```
{
  "status": "added",
  "categories": ["Food","Bills","Pet Care", "..."]
}
```
### 📄 GET /transactions — List & filter transactions
#### Example
```
GET /transactions?category=Food&limit=10
```
#### Response
```
{
  "count": 3,
  "results": [
    {
      "id": "…",
      "raw_text": "Paid ₹120 to McDonald's",
      "amount": 120,
      "category": "Food",
      "receiver": "McDonald's",
      "timestamp": "2025-11-20T13:22:01.122"
    }
  ]
}
```
### 📊 GET /summary — Spending summary
```
{
  "total_spent": 23490.0,
  "total_transactions": 129,
  "category_summary": {
    "Food": 5434,
    "Bills": 8900
  },
  "highest_spending_category": "Bills",
  "latest_transaction": { ... }
}
```
### 🔄 POST /retrain-model — Retrain classifier using feedback
#### Response
```
{
  "status": "accepted",
  "message": "Retraining started in background"
}
```