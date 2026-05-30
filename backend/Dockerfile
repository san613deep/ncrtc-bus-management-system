# =============================================================
# FastAPI Backend Dockerfile
# Multi-stage NOT needed for student project — single stage is fine.
# =============================================================

FROM python:3.12-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by some Python packages
# (psycopg2 needs libpq-dev)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency list first (Docker layer caching)
# If requirements.txt doesn't change, this layer is cached
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port 8000
EXPOSE 8000

# Default command (overridden in docker-compose.yml)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
