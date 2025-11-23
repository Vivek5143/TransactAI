# TransactAI – Hybrid Transaction Categorizer 

A comprehensive AI-powered transaction categorization system that automatically detects, categorizes, and visualizes financial transactions across mobile and web platforms.

## 🚀 Overview

TransactAI combines mobile notification monitoring, AI-powered categorization, and real-time analytics to provide complete financial intelligence:

* 🤖 **AI Engine:** Hybrid DistilBERT + rule-based transaction categorization
* 📱 **Mobile App:** Automatic UPI/banking notification detection
* 🌐 **Web Dashboard:** Real-time transaction visualization and analytics
* 🔧 **Full Stack:** FastAPI backend + Next.js frontend + Android integration

---

## 🏗️ Architecture

```
📱 Mobile Transactions → 🤖 Android Notifier → 🖥️ FastAPI Backend → 🎯 AI Categorization → 💾 PostgreSQL → 📊 Next.js Dashboard
```

---

## 💻 Technology Stack

**Backend:** FastAPI, PostgreSQL, SQLAlchemy, Docker
**AI/ML:** PyTorch, Transformers, DistilBERT, SentenceTransformers
**Frontend:** Next.js 14, TypeScript, TailwindCSS, ShadcnUI
**Mobile:** Android (Kotlin), NotificationListenerService, Retrofit
**Infrastructure:** Docker, Docker Compose

---

## 📁 Project Structure

```
TransactAI/
├── backend/                    # FastAPI Backend
│   ├── api/                    # API routes & endpoints
│   ├── core/                   # AI models & business logic
│   │   ├── model.py            # DistilBERT classifier
│   │   ├── preprocessor.py     # Text cleaning & normalization
│   │   └── rules.py            # Rule-based categorization
│   ├── training/               # Model training scripts
│   ├── data/                   # Training datasets
│   └── models/                 # Saved model artifacts
├── frontend/                   # Next.js Dashboard
│   └── transaction_categorization/
│       ├── src/app/            # Next.js app router
│       ├── components/         # React components
│       └── lib/                # Utilities & API clients
├── TransactionNotifier/        # Android Mobile App
│   ├── app/src/main/java/
│   │   └── com/transactai/
│   │       ├── NotificationService.kt
│   │       ├── ApiClient.kt
│   │       └── MainActivity.kt
│   └── app/src/main/res/
├── docker-compose.yml          # Full stack deployment
├── Dockerfile                  # Backend container
└── requirements.txt            # Python dependencies
```

---

## 🚀 Quick Start

### **Option 1: Docker (Recommended)**

```bash
git clone <repository>
cd TransactAI

# Start full stack
docker-compose up --build -d
```

* Frontend: [http://localhost:3000](http://localhost:3000)
* Backend: [http://localhost:8000/docs](http://localhost:8000/docs)
* pgAdmin: [http://localhost:5050](http://localhost:5050)

---

### **Option 2: Manual Setup**

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# Frontend
cd frontend/transaction_categorization
npm install
npm run dev
```

Access frontend at: [http://localhost:3000](http://localhost:3000)

---

## 🔧 Core Components

### 1. 🤖 AI Categorization Engine

A hybrid pipeline combining rules, DistilBERT, and embeddings.

**Three-tier categorization:**

1. Rule Engine (≥ 0.9 confidence)
2. DistilBERT classifier (≥ 0.7 confidence)
3. Embedding fallback (cosine similarity)

```python
from core.model import TransactionClassifier
classifier = TransactionClassifier()
classifier.load("models/classifier")
classifier.predict("Paid ₹500 to Zomato")
```

**Why DistilBERT?**

* 40% smaller than BERT-base
* Faster, low latency
* Works offline, private

---

### 2. 📱 Android Notification Monitor

Detects UPI/banking notifications and sends them to backend.

```kotlin
class NotificationService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Detect txn → send to backend → store locally
    }
}
```

Supports PhonePe, GPay, Paytm, Amazon Pay, bank apps.

---

### 3. 🌐 Real-time Dashboard

Features:

* Category charts
* Monthly/weekly trends
* Search & filtering
* Mobile responsive UI

---

## ⚙️ Configuration

### Backend `.env`

```
DATABASE_URL=postgresql://user:pass@localhost:5432/transactai
MODEL_PATH=./models/classifier
```

### Frontend `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Android API URL

Update in `ApiClient.kt`:

```kotlin
private const val BASE_URL = "http://YOUR_IP:8000/api/"
```

---

## 🎯 API Endpoints

```
POST /api/categorize
GET  /api/transactions
POST /api/feedback
GET  /api/analytics
```

Example:

```
POST {"text": "Paid ₹500 to Zomato"}
→ {"category": "Food", "confidence": 0.95, "source": "ML"}
```

---

## 📊 Model Training

### Data Specs

```
notification_text, message → text
category → label
```

### Training Steps

* Load & combine datasets
* Clean text
* Handle imbalance (oversampling)
* Fine-tune DistilBERT
* Save model artifacts → models/classifier/

Run:

```bash
python -m training.train_model
```

---

## 🐳 Docker Deployment

```bash
docker-compose up --build -d
```

Services:

* Backend (8000)
* Frontend (3000)
* PostgreSQL (5432)
* pgAdmin (5050)

---

## 📱 Mobile Setup

1. Build APK via Android Studio
2. Enable notification access
3. Update backend IP
4. Perform test UPI transaction
5. View result on dashboard

---

## 🚀 Production Deployment

### Frontend → Vercel

```
cd frontend/transaction_categorization
vercel --prod
```

### Backend → Railway/Render

```
DATABASE_URL=...
MODEL_PATH=./models/classifier
NEXT_PUBLIC_API_URL=https://your-backend-host/api
```

---

## 🔍 Monitoring

```
docker-compose logs -f backend
adb logcat | grep "TransactionNotifier"
curl http://localhost:8000/health
```

---

## 🎯 Performance Optimizations

### Backend

* FP16 inference
* Batch processing
* DB pooling
* Quantization

### Frontend

* SSR + caching
* Bundle splitting
* SWR for real-time updates

### Mobile

* Efficient filtering
* Retry system
* Low battery usage

---

## 🔮 Roadmap

* User feedback loop
* ML forecasting
* Hinglish support
* CSV/Excel export
* Multi-user authentication
* PDF bank statement parsing
* Investment insights
* Predictive budgeting

---

## 🤝 Contributing

1. Fork repo
2. Create branch
3. Commit changes
4. Push
5. Open PR

---

## 📄 License

MIT License
