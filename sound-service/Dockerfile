# Isolated sound-ID service. Pinned Python 3.11 (tflite-runtime has reliable
# manylinux wheels there) and ffmpeg for decoding phone clips (m4a/webm/mp4).
#
# Built by Railway with RAILWAY_DOCKERFILE_PATH=sound-service/Dockerfile, so the
# build CONTEXT is the repo root and COPY paths are sound-service/-prefixed. A
# root .dockerignore keeps node_modules/.git/dist out of the context. This var is
# set ONLY on the isolated `sound-id` service, so the main backend service is
# unaffected and keeps its own build.
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY sound-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sound-service/ .

ENV PORT=8080
# Single worker keeps the model resident once and memory predictable.
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
