#!/bin/bash

cd Backend_fastapi
uvicorn app.main:app --host 0.0.0.0 --port 5000
