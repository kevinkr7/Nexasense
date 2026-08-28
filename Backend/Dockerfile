FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Pre-download models to bake into the Docker image so they don't timeout on Cloud Run startup
ENV HF_HOME=/app/cache
RUN python -c "import torch; print('Torch imported successfully')"
RUN python -c "from transformers import pipeline; pipeline('summarization', model='facebook/bart-large-cnn'); pipeline('text2text-generation', model='t5-small'); pipeline('token-classification', model='dslim/bert-base-NER', aggregation_strategy='simple')"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
