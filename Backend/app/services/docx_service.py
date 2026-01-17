from docx import Document
import re

def extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]

    text = "\n".join(paragraphs)
    text = re.sub(r"\s{2,}", " ", text)

    if len(text.strip()) < 30:
        raise ValueError("No readable text found in DOCX.")

    return text.strip()
