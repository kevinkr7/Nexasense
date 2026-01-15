from fastapi import APIRouter, Depends
from app.core.auth import verify_firebase_token
from app.services.firestore import db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("")
def get_user_analytics(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    docs = db.collection("analytics").where("uid", "==", uid).stream()

    return [doc.to_dict() for doc in docs]
