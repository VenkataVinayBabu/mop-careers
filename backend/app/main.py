"""FastAPI application entrypoint."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    admin,
    auth,
    doubts,
    fees,
    files,
    placements,
    public,
    student,
    teacher,
    viewer,
    website,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

app = FastAPI(
    title="MOP Careers API",
    description="Backend for the MOP Careers Python Full Stack platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(website.router)
app.include_router(doubts.router)
app.include_router(fees.router)
app.include_router(placements.router)
app.include_router(teacher.router)
app.include_router(student.router)
app.include_router(viewer.router)
app.include_router(files.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.APP_ENV}
