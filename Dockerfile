FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the backend requirements file specifically
COPY backend/requirements.txt .

# Install dependencies without using cache to save space
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend source code
COPY backend/ .

# Ensure standard output is not buffered
ENV PYTHONUNBUFFERED=1

# Expose port (Railway overrides this with $PORT but it's good practice)
EXPOSE 8000

# Start the FastAPI server using the dynamically assigned PORT, default 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
