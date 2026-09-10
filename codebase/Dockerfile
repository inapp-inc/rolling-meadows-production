# Production: single-port Rolling Meadows (React SPA + FastAPI API)
FROM node:20-alpine AS web-build
WORKDIR /app
COPY web/package.json ./
RUN npm install
COPY web/ .
ARG VITE_API_BASE_URL=/rolling-meadows/api
ARG VITE_BASE_PATH=/rolling-meadows
ARG VITE_USE_MOCK_AUTH=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_USE_MOCK_AUTH=$VITE_USE_MOCK_AUTH
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/app ./app
COPY web/src/i18n/locales/en.json ./seed-data/en.json
COPY --from=web-build /app/dist ./static

ENV APP_BASE_PATH=/rolling-meadows
ENV STATIC_DIR=/app/static
ENV PUBLIC_URL=https://foundry.inapp.com/rolling-meadows

EXPOSE 4510

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "4510"]
