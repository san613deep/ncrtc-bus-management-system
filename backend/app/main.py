"""
main.py — FastAPI Application Entry Point
==========================================
This is where the FastAPI app is created and all routers are registered.
Think of this as the "wiring" file — it connects all the pieces.

When you run: uvicorn app.main:app
- app = the FastAPI() instance created below
- FastAPI reads all @router.get, @router.post decorators
- Auto-generates OpenAPI docs at /docs and /redoc
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.routers import auth, avls, incidents, notices, scheduling

settings = get_settings()

# -------------------------------------------------------------------
# Create the FastAPI application
# -------------------------------------------------------------------
app = FastAPI(
    title="NCRTC Bus Management System API",
    description="""
    Backend API for the NCRTC Feeder Bus Management System.
    
    ## Authentication
    Most endpoints require a JWT Bearer token.
    Get a token from `POST /auth/login`.
    
    ## Modules
    - **AVLS**: Live vehicle tracking and GPS history
    - **IMS**: Incident reporting and management
    - **CMS**: Notices and read receipts
    - **Scheduling**: Routes and duty management (proxied to Spring Boot)
    """,
    version="1.0.0",
    docs_url="/docs",         # Swagger UI at /docs
    redoc_url="/redoc",       # ReDoc at /redoc
    openapi_url="/openapi.json",
)

# -------------------------------------------------------------------
# CORS Middleware
# Allows the Next.js frontend (localhost:3000) to call this API.
# In production, replace with your actual frontend domain.
#
# WHY CORS? Browsers block cross-origin requests by default.
# CORS headers tell browsers "yes, this other origin is allowed".
# -------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# -------------------------------------------------------------------
# Register Routers
# Each router handles one module's API endpoints.
# prefix="/api/v1" is added here so all routes start with /api/v1/...
# -------------------------------------------------------------------
app.include_router(auth.router,        prefix="/api/v1", tags=["Auth"])
app.include_router(avls.router,        prefix="/api/v1", tags=["AVLS"])
app.include_router(incidents.router,   prefix="/api/v1", tags=["IMS"])
app.include_router(notices.router,     prefix="/api/v1", tags=["CMS"])
app.include_router(scheduling.router,  prefix="/api/v1", tags=["Scheduling"])


# -------------------------------------------------------------------
# Health Check Endpoint
# Used by Docker healthchecks and load balancers to know if the app is up.
# -------------------------------------------------------------------
@app.get("/health", tags=["System"])
def health_check():
    """Simple health check — returns 200 OK if the API is running."""
    return {"status": "ok", "service": "ncrtc-bms-backend"}


# -------------------------------------------------------------------
# Root endpoint — redirects to docs
# -------------------------------------------------------------------
@app.get("/", tags=["System"])
def root():
    return {
        "message": "NCRTC Bus Management System API",
        "docs": "/docs",
        "health": "/health",
    }
