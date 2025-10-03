# Use the lightweight Python image
FROM python:3.13-slim

# Set the working directory inside the container
WORKDIR /app

# --- INSTALL DEPENDENCIES ---
# CRITICAL CHANGE: The Dockerfile is now in the root, so we must explicitly
# specify the 'Backend/' path for the file's source.
COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- COPY CODE ---
# CRITICAL CHANGE: Copy all contents of the 'Backend' folder into the container's /app directory.
# This ensures APIThing.py, Models/, Data/, etc., are correctly placed at /app/
COPY Backend . 

# Expose the API port
EXPOSE 8000

# Run the application using uvicorn. 
# Since APIThing.py is now at /app/APIThing.py, this command remains correct.
CMD ["uvicorn", "APIThing:app", "--host", "0.0.0.0", "--port", "8000"]