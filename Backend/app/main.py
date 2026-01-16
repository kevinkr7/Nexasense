import app.core.firebase  # initializes Firebase Admin
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.health import router as health_router
from app.routes.protected import router as protected_router
from app.routes.profile import router as profile_router
from app.routes.notes import router as notes_router


app = FastAPI(title=settings.PROJECT_NAME)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(protected_router)
app.include_router(profile_router)
app.include_router(notes_router)

@app.get("/")
def root():
    return {"message": "Welcome to NexaSense Backend"}
