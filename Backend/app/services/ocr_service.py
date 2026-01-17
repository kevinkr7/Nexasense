import cv2
import pytesseract
from pytesseract import Output
import re
import os
import shutil
from typing import Dict, List, Tuple, Any

# IMPORTANT: Explicit Tesseract path for Windows
windows_tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(windows_tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = windows_tesseract_path
else:
    system_tesseract = shutil.which("tesseract")
    if system_tesseract:
        pytesseract.pytesseract.tesseract_cmd = system_tesseract


MIN_OCR_DPI = 300
LOW_CONFIDENCE_THRESHOLD = 50
DEFAULT_PSM = 4


def preprocess_image(image_path: str):
    """
    Conservative preprocessing for handwritten & printed notes.
    Preserves character strokes and avoids OCR hallucination.
    """

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Image not found or invalid image path")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Light denoising (safe for handwriting)
    denoised = cv2.fastNlMeansDenoising(
        gray,
        h=30,
        templateWindowSize=7,
        searchWindowSize=21
    )

    # Contrast normalization
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    normalized = clahe.apply(denoised)

    # Adaptive thresholding for uneven illumination
    thresholded = cv2.adaptiveThreshold(
        normalized,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        35,
        11
    )

    # Resize to OCR-friendly resolution
    height, width = thresholded.shape[:2]
    scale = max(MIN_OCR_DPI / 150, 1.0)
    resized = cv2.resize(
        thresholded,
        (int(width * scale), int(height * scale)),
        interpolation=cv2.INTER_CUBIC
    )

    return resized


def build_tesseract_config(psm: int = DEFAULT_PSM) -> str:
    # OEM 1 → LSTM engine only
    return f"--oem 1 --psm {psm}"


def extract_text_from_image(image_path: str, include_metadata: bool = False):
    """
    Extract text from image using Tesseract OCR.
    Optimized for handwritten notes.
    """

    processed_image = preprocess_image(image_path)

    # OCR configuration:
    # OEM 1 → LSTM engine only
    # PSM 4 → Assume a single column of text with possible paragraph breaks
    custom_config = build_tesseract_config()

    if not image_contains_text(processed_image, custom_config):
        raise ValueError("No readable text detected in the uploaded image.")

    text, metadata = extract_layout_aware_text(processed_image, custom_config)
    cleaned = clean_text(text)

    if include_metadata:
        return {
            "text": cleaned,
            "metadata": metadata
        }

    return cleaned


def extract_layout_aware_text(processed_image, custom_config: str) -> Tuple[str, Dict[str, Any]]:
    data = pytesseract.image_to_data(
        processed_image,
        lang="eng",
        config=custom_config,
        output_type=Output.DICT
    )

    lines: List[Dict[str, Any]] = []
    low_confidence_tokens: List[Dict[str, Any]] = []
    grouped_lines: Dict[Tuple[int, int, int], List[Dict[str, Any]]] = {}

    num_items = len(data.get("text", []))
    for idx in range(num_items):
        text = data["text"][idx].strip()
        if not text:
            continue

        conf_value = _safe_confidence(data["conf"][idx])
        token = {
            "text": text,
            "confidence": conf_value,
            "left": data["left"][idx],
            "top": data["top"][idx],
            "width": data["width"][idx],
            "height": data["height"][idx],
            "block_num": data["block_num"][idx],
            "par_num": data["par_num"][idx],
            "line_num": data["line_num"][idx],
            "word_num": data["word_num"][idx],
        }

        line_key = (token["block_num"], token["par_num"], token["line_num"])
        grouped_lines.setdefault(line_key, []).append(token)

        if conf_value < LOW_CONFIDENCE_THRESHOLD:
            low_confidence_tokens.append(token)

    for line_key in sorted(grouped_lines.keys()):
        words = sorted(grouped_lines[line_key], key=lambda item: item["word_num"])
        line_text = _join_words(words)
        lines.append({
            "line_key": line_key,
            "text": line_text,
            "words": words
        })

    text = _lines_to_text(lines)
    metadata = {
        "lines": lines,
        "low_confidence_tokens": low_confidence_tokens
    }
    return text, metadata


def image_contains_text(processed_image, custom_config: str) -> bool:
    data = pytesseract.image_to_data(
        processed_image,
        lang="eng",
        config=custom_config,
        output_type=Output.DICT
    )

    texts = data.get("text", [])
    confs = data.get("conf", [])

    valid_words = 0
    for word, conf in zip(texts, confs):
        word = word.strip()
        if not word or len(word) < 2:
            continue
        conf_value = _safe_confidence(conf)
        if conf_value >= 45:
            valid_words += 1

    return valid_words >= 2


def clean_text(text: str) -> str:
    # Remove OCR junk symbols
    text = re.sub(r"[|!'\"]{2,}", " ", text)

    # Fix common OCR spacing issues
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"([a-zA-Z])(\d)", r"\1 \2", text)
    text = re.sub(r"(\d)([a-zA-Z])", r"\1 \2", text)

    # Normalize whitespace while preserving line breaks
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" *\n *", "\n", text)

    # Remove non-ASCII noise
    text = re.sub(r"[^\x00-\x7F]+", " ", text)

    return text.strip()


def _safe_confidence(conf_value: Any) -> float:
    try:
        return float(conf_value)
    except (ValueError, TypeError):
        return -1.0


def _join_words(words: List[Dict[str, Any]]) -> str:
    if not words:
        return ""
    text = words[0]["text"]
    for word in words[1:]:
        if re.match(r"^[\.,;:\)\]\}]+$", word["text"]):
            text += word["text"]
        elif text.endswith("-"):
            text += word["text"]
        else:
            text += f" {word['text']}"
    return text


def _lines_to_text(lines: List[Dict[str, Any]]) -> str:
    text_lines: List[str] = []
    previous_block = None
    for line in lines:
        block_num = line["line_key"][0]
        if previous_block is not None and block_num != previous_block:
            text_lines.append("")
        text_lines.append(line["text"])
        previous_block = block_num
    return "\n".join(text_lines)


def extract_text(file_path: str, file_type: str) -> str:
    file_type = file_type.lower()

    if file_type.startswith("image/"):
        return extract_text_from_image(file_path)

    if file_type == "application/pdf":
        from app.services.pdf_service import extract_text_from_pdf
        return extract_text_from_pdf(file_path)

    if file_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ):
        from app.services.docx_service import extract_text_from_docx
        return extract_text_from_docx(file_path)

    raise ValueError("Unsupported file format")
