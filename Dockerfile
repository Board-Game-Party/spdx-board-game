# ==============================================================================
# Multi-Stage Dockerfile for PairEval (FastAPI Backend + React Frontend)
# Stages: deps -> build -> test -> runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: deps (Install Python backend & Node frontend dependencies)
# ------------------------------------------------------------------------------
# Pin base image with explicit version tag to prevent unpredictable updates (never use :latest)
FROM python:3.12-slim AS deps

# Set working directory inside container
WORKDIR /app

# Install system utilities (curl for healthcheck and Node.js for frontend toolchain)
RUN apt-get update && apt-get install -y --no-install-recommends curl nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first to leverage Docker layer caching
COPY requirements.txt ./
COPY package.json ./
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install Python backend dependencies without caching wheel files to reduce image size
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js frontend dependencies using clean reproducible install
RUN npm --prefix frontend ci


# ------------------------------------------------------------------------------
# Stage 2: build (Compile TypeScript & bundle React frontend assets)
# ------------------------------------------------------------------------------
# Inherit installed dependencies from deps stage
FROM deps AS build

# Set working directory
WORKDIR /app

# Copy full source code into build stage
COPY . .

# Build static React frontend production bundle into frontend/dist
RUN npm --prefix frontend run build


# ------------------------------------------------------------------------------
# Stage 3: test (Run automated Pytest backend and Vitest frontend test suites)
# ------------------------------------------------------------------------------
# Inherit built app and full development tooling from build stage
FROM build AS test

# Set working directory
WORKDIR /app

# Set environment variables for testing
ENV NODE_ENV=test
ENV PYTHONUNBUFFERED=1

# Run both Backend Pytest and Frontend Vitest suites (fails stage if tests fail)
CMD ["sh", "-c", "python3 -m pytest -v && npm --prefix frontend run test"]


# ------------------------------------------------------------------------------
# Stage 4: runtime (Minimal, hardened production image)
# ------------------------------------------------------------------------------
# Pin minimal clean Python runtime image
FROM python:3.12-slim AS runtime

# Set working directory
WORKDIR /app

# Set production environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV ENVIRONMENT=production

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group for security compliance
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/bash -m appuser

# Copy installed Python packages from deps stage
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy backend application source code
COPY backend ./backend

# Copy compiled frontend production assets from build stage
COPY --from=build /app/frontend/dist ./frontend/dist

# Set file ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Document exposed network port (FastAPI backend port)
EXPOSE 8000

# Configure health check hitting /api/health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI application using Uvicorn server in production mode
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
