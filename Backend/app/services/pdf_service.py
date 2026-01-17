import pdfplumber
import re

def extract_text_from_pdf(file_path: str) -> str:
    text_blocks = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_blocks.append(page_text)

    text = "\n".join(text_blocks)
    text = re.sub(r"\s{2,}", " ", text)

    if len(text.strip()) < 50:
        raise ValueError("No readable text found in PDF.")

    return text.strip()
