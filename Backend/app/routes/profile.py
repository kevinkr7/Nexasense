from fastapi import APIRouter, Depends
from app.core.auth import verify_firebase_token
from app.services.profile_service import (
    get_profile,
    create_profile,
    update_profile
)

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("")
def fetch_profile(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    email = user.get("email")

    profile = get_profile(uid)
    if not profile:
        profile = create_profile(uid, email)

    return profile

@router.put("")
def edit_profile(payload: dict, user=Depends(verify_firebase_token)):
    uid = user["uid"]
    update_profile(uid, payload)
    return {"status": "updated"}
