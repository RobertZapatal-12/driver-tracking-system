# Driver Tracking System

A web application to monitor and visualize driver locations in real time.

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript served via Python HTTP server on port 5000
- **Backend**: FastAPI (Python) REST API running on port 8000
- **Database**: PostgreSQL (Replit built-in)

## Project Structure

```
.
├── Backend_fastapi/         # FastAPI backend
│   ├── app/
│   │   ├── main.py          # App entry point with CORS configured
│   │   ├── database.py      # DB connection using DATABASE_URL env var
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── routers/         # Route handlers (drivers, users, vehicles, locations, trips)
│   └── requirements.txt
├── Front_end/Proyecto/      # Static frontend
│   ├── index.html           # Main HTML (SPA-style with dynamic page loading)
│   ├── css/style.css
│   ├── js/app.js            # Main JS (routing, modals, map)
│   ├── js/script.js         # Vehicle form logic
│   ├── pages/               # HTML page fragments loaded dynamically
│   └── components/          # Sidebar and other reusable components
├── Database/                # SQL scripts
│   ├── schema.sql
│   ├── seed.sql
│   ├── views.sql
│   └── indexes.sql
└── start.sh                 # Startup script (runs both services)
```

## Running the App

```bash
bash start.sh
```

- Frontend: http://0.0.0.0:5000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (set automatically by Replit)

## Key Features

- Driver registration and management
- Vehicle assignment and tracking
- Location history and real-time map (Leaflet.js + OpenStreetMap)
- Route/trip management
- Dashboard with Bootstrap 5 UI
