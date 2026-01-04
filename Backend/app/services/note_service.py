import uuid
from datetime import datetime
from app.services.firestore import db

COLLECTION = "notes"

def create_note(uid: str, file_name: str, file_type: str):
    note_id = str(uuid.uuid4())

    note = {
        "noteId": note_id,
        "uid": uid,
        "fileName": file_name,
        "fileType": file_type,
        "status": "uploaded",
        "createdAt": datetime.utcnow()
    }

    db.collection(COLLECTION).document(note_id).set(note)
    return note

def get_notes_by_user(uid: str):
    docs = db.collection(COLLECTION).where("uid", "==", uid).stream()
    return [doc.to_dict() for doc in docs]
