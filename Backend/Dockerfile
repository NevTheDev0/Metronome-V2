FROM python:3.13-slim

WORKDIR /app

# Copy requirements.txt and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything else in the Backend folder (APIThing.py, Models/, Data/, etc.)
COPY . . 

EXPOSE 8000

# Run APIThing.py
CMD ["uvicorn", "APIThing:app", "--host", "0.0.0.0", "--port", "8000"]