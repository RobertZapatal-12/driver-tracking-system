from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
