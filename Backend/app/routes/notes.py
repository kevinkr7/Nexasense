import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File
from app.core.auth import verify_firebase_token
from app.services.note_service import create_note, get_notes_by_user
from app.services.ocr_service import extract_text_from_image
from app.services.nlp_service import summarize_text
from app.services.nlp_service import simplify_text
from app.services.nlp_service import build_mindmap
from app.services.analytics_service import log_event
from app.services.knowledge_enrichment import enrich_summary




router = APIRouter(prefix="/notes", tags=["Notes"])


@router.post("/upload")
def upload_note(
    file: UploadFile = File(...),
    user=Depends(verify_firebase_token)
):
    uid = user["uid"]

    upload_dir = "app/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = f"{upload_dir}/{file.filename}"

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

    summary = summarize_text(extracted_text)
    simplified = simplify_text(summary)

    mindmap = build_mindmap(
        simplified,
        title="Generated Concepts"
    )

    log_event(uid, note["noteId"], "summaryViewed")

# FIX: Count underscores to distinguish "node_honey" (keep) from "node_honey_0" (skip)
    concept_labels = [
        node["label"]
        for node in mindmap["nodes"]
        if node["id"].startswith("node_") and node["id"].count("_") == 1
    ]

    enriched = enrich_summary(summary, concept_labels)

    # 4️⃣ Temporary response (Module 5 verification)
    return {
        "note":note,
        "summary": summary,
        "simplified": simplified,
        "mindmap": mindmap,
        "enriched": enriched
    }



@router.get("")
def list_notes(user=Depends(verify_firebase_token)):
    uid = user["uid"]
    return get_notes_by_user(uid)
