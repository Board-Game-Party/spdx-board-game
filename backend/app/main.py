from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
from backend.app.features.auth.router import router as auth_router
from backend.app.features.classroom.router import router as classroom_router
from backend.app.features.assignment.router import router as assignment_router
from backend.app.features.pairing.router import router as pairing_router
from backend.app.features.evaluation.router import router as evaluation_router
from backend.app.features.scoring.router import router as scoring_router
from backend.app.features.integrity.router import router as integrity_router
from backend.app.features.reporting.router import router as reporting_router
from backend.app.features.audit.router import router as audit_router
from backend.app.features.notification.router import router as notification_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Campus Pairwise Evaluation Service REST API",
    version="1.0.0",
    lifespan=lifespan
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(classroom_router, prefix=settings.API_V1_STR)
app.include_router(assignment_router, prefix=settings.API_V1_STR)
app.include_router(pairing_router, prefix=settings.API_V1_STR)
app.include_router(evaluation_router, prefix=settings.API_V1_STR)
app.include_router(scoring_router, prefix=settings.API_V1_STR)
app.include_router(integrity_router, prefix=settings.API_V1_STR)
app.include_router(reporting_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(notification_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "service": "PairEval API",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
