# Contributing to TransactAI

Thank you for contributing to **TransactAI**!  
This guide explains how to run the project locally, follow the coding style, and create stable pull requests.

---

## 🚀 1. Project Setup

### **Clone the repository**
```sh
git clone https://github.com/Vivek5143/TransactAI.git
cd TransactAI
```
🧱 2. Environment Setup
Install Python
Python 3.10+ is recommended.

Create virtual environment
```
python -m venv venv
Activate
```

Windows
```
venv\Scripts\activate
```

Mac/Linux
```
source venv/bin/activate
```

Install dependencies
```
pip install -r requirements.txt
```

🔐 3. Environment Variables
Copy the example file:
```
cp .env.example .env
```
Update the values:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=transactai
```
If using Docker → these are already configured.

🐳 4. Running Using Docker (recommended)
Start all services:

```
docker-compose up --build
```
Services:

```
Backend API	http://localhost:8000
Postgres	localhost:5432
pgAdmin	http://localhost:5050
```

pgAdmin credentials:
```
Email: admin@admin.com
Password: admin
```
🖥 5. Running Locally (without Docker)
Start your local Postgres first.

Create the database:
```
CREATE DATABASE transactai;
Create tables
python create_tables.py
```
Run backend
```
uvicorn api.main:app --reload
```
Backend will run at:
👉 http://127.0.0.1:8000/

🧪 6. CLI Tester (SMS simulation)
Run:
```
python test.py
```
Actions supported:

Classify a transaction

Manual category selection

Add new category

Store feedback

Verify DB inserts

📦 7. Code Structure
```
api/        → FastAPI routes + DB logic
core/       → ML model, preprocessing, rules
models/     → Saved classifier
training/   → Training pipeline
data/       → Training dataset & taxonomy
```
📝 8. Coding Guidelines
Use black for code formatting

Never push directly to main

Create feature branches:
```
git checkout -b feature/<feature-name>
```
Write meaningful commit messages

No large model files > 50MB (use Git LFS or HuggingFace)

✔ 9. Submitting a Pull Request
Ensure backend runs without errors

Add screenshots for API or behavior changes

Ask a maintainer to review the PR

Resolve comments before merging

Happy contributing ❤️