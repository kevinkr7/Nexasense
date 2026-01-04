import shutil
from fastapi import APIRouter, Depends, UploadFile, File
from app.core.auth import verify_firebase_token
from app.services.note_service import create_note, get_notes_by_user
from app.services.ocr_service import extract_text_from_image

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.post("/upload")
def upload_note(
    file: UploadFile = File(...),
    user=Depends(verify_firebase_token)
):
    uid = user["uid"]

    file_path = f"app/uploads/{file.filename}"

    # 1️⃣ Save uploaded file to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2️⃣ OCR — extract text from saved image
    extracted_text = extract_text_from_image(file_path)

    # (TEMP) Debug / verify OCR output
    print("---- OCR OUTPUT START ----")
    print(extracted_text)
    print("---- OCR OUTPUT END ----")

    # 3️⃣ Store note metadata (existing logic)
    note = create_note(
        uid=uid,
        file_name=file.filename,
        file_type=file.content_type
    )

    # 4️⃣ Temporary response (Module 4 verification)
    return {
        "note": note,
        "extracted_text": extracted_text
    }


@router.get("")
def list_notes(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    return get_notes_by_user(uid)
