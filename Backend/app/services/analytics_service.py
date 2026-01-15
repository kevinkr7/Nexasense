from datetime import datetime
from app.services.firestore import db


def log_event(uid: str, note_id: str, event: str):
    doc_ref = db.collection("analytics").document(f"{uid}_{note_id}")
    doc = doc_ref.get()

    data = {
        "uid": uid,
        "noteId": note_id,
        "lastAccessed": datetime.utcnow().isoformat()
    }

    if not doc.exists:
        data["events"] = {event: True}
        data["createdAt"] = datetime.utcnow().isoformat()
        doc_ref.set(data)
    else:
        doc_ref.update({
            f"events.{event}": True,
            "lastAccessed": datetime.utcnow().isoformat()
        })
