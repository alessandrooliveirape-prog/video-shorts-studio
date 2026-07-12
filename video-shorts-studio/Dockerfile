FROM python:3.11-slim

# Install system dependencies: FFmpeg + ferramentas essenciais
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend
COPY backend/ ./

# Create output directory for videos
RUN mkdir -p /app/outputs /app/outputs/uploads

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Start server
CMD ["uvicorn", "fastapi_backend:app", "--host", "0.0.0.0", "--port", "8000"]
