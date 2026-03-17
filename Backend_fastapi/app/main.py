from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import drivers, users, locations, vehicles, trips, trips2

app = FastAPI(
    title="Driver Tracking API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drivers.router)
app.include_router(users.router)
app.include_router(vehicles.router)
app.include_router(locations.router)
app.include_router(trips.router)
app.include_router(trips2.router)

FRONTEND_DIR = Path(__file__).parent.parent.parent / "Front_end" / "Proyecto"

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
