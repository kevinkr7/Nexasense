from fastapi import APIRouter, Depends
from app.core.auth import verify_firebase_token

router = APIRouter()

@router.post("/protected")
def protected_route(user=Depends(verify_firebase_token)):
    return {
        "message": "You are authenticated",
        "user_id": user.get("uid"),
        "email": user.get("email")
    }
