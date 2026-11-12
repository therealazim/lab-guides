# Build the React/Vite frontend from source for every Koyeb deployment.
FROM node:22-alpine AS frontend

WORKDIR /app

# The translation validation script runs with Python during the Vite build.
RUN apk add --no-cache python3

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build


# Run the Flask API and serve the freshly-built frontend.
FROM python:3.11-slim AS app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Override any stale, committed dist/ directory with the fresh Vite build above.
COPY --from=frontend /app/dist ./dist

EXPOSE 8000

CMD ["sh", "-c", "gunicorn server:app --bind 0.0.0.0:${PORT:-8000}"]
