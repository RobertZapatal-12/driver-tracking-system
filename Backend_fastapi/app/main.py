from fastapi import FastAPI
from app.routers import drivers, users, locations, vehicles, trips, trips2

app = FastAPI(
    title="Driver Tracking API"
)

app.include_router(drivers.router)
app.include_router(users.router)
app.include_router(vehicles.router)
app.include_router(locations.router)
app.include_router(trips.router)
app.include_router(trips2.router)
#