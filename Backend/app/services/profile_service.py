from datetime import datetime
from app.services.firestore import db

COLLECTION = "users"

def get_profile(uid: str):
    doc = db.collection(COLLECTION).document(uid).get()
    return doc.to_dict() if doc.exists else None

def create_profile(uid: str, email: str):
    profile = {
        "uid": uid,
        "email": email,
        "learningStyle": "mixed",
        "examUrgency": "medium",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    db.collection(COLLECTION).document(uid).set(profile)
    return profile

def update_profile(uid: str, data: dict):
    data["updatedAt"] = datetime.utcnow()
    db.collection(COLLECTION).document(uid).update(data)
