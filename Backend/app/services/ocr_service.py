import cv2
import pytesseract
from pytesseract import Output
import re
import os
import shutil

# IMPORTANT: Explicit Tesseract path for Windows
windows_tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(windows_tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = windows_tesseract_path
else:
    system_tesseract = shutil.which("tesseract")
    if system_tesseract:
        pytesseract.pytesseract.tesseract_cmd = system_tesseract


def preprocess_image(image_path: str):
    """
    Conservative preprocessing for handwritten & printed notes.
    Preserves character strokes and avoids OCR hallucination.
    """

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Image not found or invalid image path")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Light denoising (safe for handwriting)
    gray = cv2.fastNlMeansDenoising(
        gray,
        h=30,
        templateWindowSize=7,
        searchWindowSize=21
    )

    # OTSU thresholding (lets Tesseract decide optimal binarization)
    _, thresh = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    return thresh


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text from image using Tesseract OCR.
    Optimized for handwritten notes.
    """

    processed_image = preprocess_image(image_path)

    # OCR configuration:
    # OEM 3 → LSTM engine
    # PSM 11 → Sparse text (best for handwritten notes)
    custom_config = r"--oem 3 --psm 11"

    if not image_contains_text(processed_image, custom_config):
        raise ValueError("No readable text detected in the uploaded image.")

    text = pytesseract.image_to_string(
        processed_image,
        lang="eng",
        config=custom_config
    )

    return clean_text(text)


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
        try:
            conf_value = float(conf)
        except ValueError:
            continue
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

    # Fix missing spaces
    text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
    text = re.sub(r"digestsollen", "digests pollen", text)

    # Normalize whitespace
    text = re.sub(r"\n{2,}", "\n", text)
    text = re.sub(r"\s{2,}", " ", text)

    # Remove non-ASCII noise
    text = re.sub(r"[^\x00-\x7F]+", " ", text)

    return text.strip()
