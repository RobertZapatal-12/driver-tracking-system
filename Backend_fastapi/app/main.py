from fastapi import FastAPI
from app.routers import drivers, users, locations, trips

app = FastAPI(
    title="Driver Tracking API"
)

app.include_router(drivers.router)
app.include_router(users.router)
app.include_router(locations.router)
app.include_router(trips.router)