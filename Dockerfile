FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ---- Copy ONLY requirements first (Better caching) ----
COPY requirements.txt /app/requirements.txt

RUN pip install --default-timeout=200 --retries=20 --no-cache-dir -r requirements.txt

# ---- Copy rest of the project ----
COPY . /app

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
