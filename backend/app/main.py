"""
Main FastAPI application entry point for GridPilot EV Charging Queue & Power Allocation Manager.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.simulations import router as simulations_router

app = FastAPI(
    title="GridPilot API",
    description="EV Charging Queue & Power Allocation Manager REST API",
    version="1.0.0",
)

# Configure CORS Middleware for frontend access (Next.js default on localhost:3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include simulation endpoints router
app.include_router(simulations_router)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Basic health check endpoint returning service operational status."""
    return {"status": "ok"}
