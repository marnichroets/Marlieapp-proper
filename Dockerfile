FROM python:3.11-slim

WORKDIR /app

# Install Python deps first so this layer caches unless requirements change.
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source (main.py etc.) lands at /app, so `uvicorn main:app` resolves.
COPY backend/ ./

# Railway injects $PORT at runtime; this default only matters for local runs.
ENV PORT=8080

# Shell form so ${PORT} is expanded at start time.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
