# ---- Base Python image ----
FROM python:3.10-slim

# ---- Set working directory ----
WORKDIR /app

# ---- Install system dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*

# ---- Copy project files ----
COPY . /app

# ---- Install deps ----
RUN pip install --no-cache-dir -r requirements.txt

# ---- Expose app port ----
EXPOSE 8000

# ---- Start FastAPI using uvicorn ----
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
