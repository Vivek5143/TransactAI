FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# install build deps once
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# copy only requirements first for caching
COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --default-timeout=200 --retries=20 --no-cache-dir -r requirements.txt

# now copy the ENTIRE backend directory
COPY . .

# Ensure data directory exists and copy training dataset
RUN mkdir -p /app/data
COPY data/ /app/data/

ENV PYTHONPATH="/app"

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
