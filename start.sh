#!/bin/bash

# Start backend API on port 8000 in background
cd Backend_fastapi
uvicorn app.main:app --host localhost --port 8000 &
BACKEND_PID=$!
cd ..

# Serve frontend on port 5000
cd Front_end/Proyecto
python3 -m http.server 5000 --bind 0.0.0.0

# Cleanup
kill $BACKEND_PID
