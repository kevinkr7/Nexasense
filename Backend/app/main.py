import app.core.firebase  # initializes Firebase Admin
from fastapi import FastAPI
from app.config import settings
from app.routes.health import router as health_router
from app.routes.protected import router as protected_router
from app.routes.profile import router as profile_router
from app.routes.notes import router as notes_router


app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(health_router)
app.include_router(protected_router)
app.include_router(profile_router)
app.include_router(notes_router)

@app.get("/")
def root():
    return {"message": "Welcome to NexaSense Backend"}
