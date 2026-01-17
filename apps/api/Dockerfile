# ============================================
# RestoNext MX - FastAPI Backend Dockerfile
# ============================================
# Multi-stage build for optimized production image
# Final image: ~200MB (vs ~1GB without optimization)
# ============================================

# ============================================
# Stage 1: Builder
# Install all dependencies including build tools
# ============================================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Development (for docker-compose dev)
# ============================================
FROM python:3.11-slim AS development

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

EXPOSE 8000

# Development command with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ============================================
# Stage 3: Production
# Minimal image with only runtime dependencies
# ============================================
FROM python:3.11-slim AS production

WORKDIR /app

# Create non-root user for security
RUN groupadd --gid 1001 restonext && \
    useradd --uid 1001 --gid restonext --shell /bin/bash --create-home restonext

# Install only runtime dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=restonext:restonext . .

# Create logs directory and make start script executable
RUN mkdir -p /app/logs && chown restonext:restonext /app/logs && chmod +x /app/start.sh

# Switch to non-root user
USER restonext

# Default port (can be overridden by Railway's $PORT)
ENV PORT=8000

# Healthcheck using dynamic port
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 8000

# Production command - smart startup script
# Handles: DB stamp if needed, missing columns, then starts uvicorn
CMD ["/app/start.sh"]
