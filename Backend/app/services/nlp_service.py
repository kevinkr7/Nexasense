import re
import unicodedata
from collections import Counter
from typing import Iterable, List, Tuple

from transformers import pipeline

# Load once (important for performance)
summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn"
)

simplifier = pipeline(
    "text2text-generation",
    model="t5-small"
)


def _load_ner_pipeline():
    # Lazy-load to avoid forcing NER model downloads if NER is never used.
    return pipeline(
        "token-classification",
        model="dslim/bert-base-NER",
        aggregation_strategy="simple"
    )


_NER_PIPELINE = None


def _get_ner_pipeline():
    global _NER_PIPELINE
    if _NER_PIPELINE is None:
        _NER_PIPELINE = _load_ner_pipeline()
    return _NER_PIPELINE


def sanitize_text(text: str) -> str:
    """
    Aggressively normalize noisy OCR/PDF/DOCX text while preserving technical terms.
    """
    if not text:
        return ""

    # Unicode normalization reduces PDF/OCR artifacts without altering scientific symbols.
    normalized = unicodedata.normalize("NFKC", text)

    # Standardize line endings early to simplify downstream repairs.
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")

    # Repair hyphenated line breaks from OCR (e.g., "inter-\nface" -> "interface").
    normalized = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", normalized)

    # Remove common OCR junk symbols while keeping math and technical punctuation.
    normalized = re.sub(r"[\uFFFD\u200B\uFEFF]", " ", normalized)
    normalized = re.sub(r"[•·∙◦▪▶►]+", " ", normalized)
    normalized = re.sub(r"[_]{3,}", " ", normalized)
    normalized = re.sub(r"[|]{2,}", " ", normalized)

    # Normalize whitespace but keep newlines for sentence reconstruction.
    normalized = re.sub(r"[\t\f\v]+", " ", normalized)
    normalized = re.sub(r"\s*\n\s*", "\n", normalized)
    normalized = re.sub(r" {2,}", " ", normalized)

    return normalized.strip()


def _is_abbreviation(token: str) -> bool:
    return bool(re.search(
        r"\b(?:e\.g|i\.e|etc|vs|dr|mr|mrs|ms|prof|fig|eq|cf|st)\.$",
        token.lower()
    ))


def reconstruct_sentences(text: str) -> List[str]:
    """
    Rebuild sentences from noisy line-broken OCR/PDF text.
    """
    cleaned = sanitize_text(text)
    if not cleaned:
        return []

    lines = [line.strip() for line in cleaned.split("\n") if line.strip()]
    if not lines:
        return []

    merged_lines: List[str] = []
    buffer = ""
    for line in lines:
        if not buffer:
            buffer = line
            continue

        prev = buffer.rstrip()
        # Preserve paragraph boundaries when a line ends with strong punctuation.
        if re.search(r"[.!?]$", prev) and not _is_abbreviation(prev):
            merged_lines.append(prev)
            buffer = line
            continue

        # Join lines when the previous line likely continues (no punctuation or comma/colon).
        if re.search(r"[,:;]$", prev) or not re.search(r"[.!?]$", prev):
            buffer = f"{prev} {line}"
        else:
            merged_lines.append(prev)
            buffer = line

    if buffer:
        merged_lines.append(buffer)

    # Split merged lines into sentences while protecting abbreviations.
    sentence_candidates = []
    for block in merged_lines:
        # Use punctuation + whitespace as primary segmentation, fallback to length-based splitting.
        parts = re.split(r"(?<=[.!?])\s+", block)
        for part in parts:
            stripped = part.strip()
            if stripped:
                sentence_candidates.append(stripped)

    sentences: List[str] = []
    for candidate in sentence_candidates:
        if len(candidate.split()) <= 4 and not re.search(r"[.!?]$", candidate):
            # Short OCR fragments are attached to neighboring context if possible.
            if sentences:
                sentences[-1] = f"{sentences[-1]} {candidate}"
            else:
                sentences.append(candidate)
            continue
        sentences.append(candidate)

    return sentences


def _estimate_word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def chunk_sentences(sentences: Iterable[str], max_words: int = 350, overlap: int = 1) -> List[str]:
    """
    Sentence-aware chunking with overlap to preserve context for transformer models.
    """
    chunks: List[str] = []
    current: List[str] = []
    current_words = 0

    for sentence in sentences:
        sentence_words = _estimate_word_count(sentence)
        if current and current_words + sentence_words > max_words:
            chunks.append(" ".join(current).strip())
            if overlap > 0:
                current = current[-overlap:]
                current_words = sum(_estimate_word_count(s) for s in current)
            else:
                current = []
                current_words = 0

        current.append(sentence)
        current_words += sentence_words

    if current:
        chunks.append(" ".join(current).strip())

    return chunks


def _dynamic_summary_lengths(text: str) -> Tuple[int, int]:
    """
    Choose summarization bounds based on input length to prevent over/under-compression.
    """
    words = _estimate_word_count(text)
    max_length = max(80, min(180, int(words * 0.35)))
    min_length = max(40, min(90, int(words * 0.18)))
    if min_length >= max_length:
        min_length = max(30, max_length - 20)
    return max_length, min_length


def _summarize_chunk(chunk: str) -> str:
    max_length, min_length = _dynamic_summary_lengths(chunk)
    result = summarizer(
        chunk,
        max_length=max_length,
        min_length=min_length,
        do_sample=False
    )
    return result[0]["summary_text"].strip()


def summarize_text(text: str) -> str:
    """
    Generate an academic-style summary from sanitized, reconstructed text.
    """
    if not text or len(text.strip()) < 50:
        return "Text too short for summarization."

    sentences = reconstruct_sentences(text)
    if not sentences:
        return "Text too short for summarization."

    chunks = chunk_sentences(sentences)
    summaries = [_summarize_chunk(chunk) for chunk in chunks]

    merged = " ".join(summaries).strip()
    if len(summaries) > 1 and _estimate_word_count(merged) > 220:
        # Light second-pass summarization stabilizes multi-chunk outputs.
        merged = _summarize_chunk(merged)

    return merged


def simplify_text(text: str) -> str:
    """
    Simplify academic text into student-friendly explanation.
    """
    sanitized = sanitize_text(text)
    if not sanitized or len(sanitized.strip()) < 30:
        return sanitized

    # T5 works best with task prefix; sanitized text avoids OCR artifacts.
    input_text = "simplify: " + sanitized

    result = simplifier(
        input_text,
        max_length=200,
        min_length=80,
        do_sample=False
    )

    return result[0]["generated_text"]


def _tokenize_terms(text: str) -> List[str]:
    # Preserve technical terms with digits, plus, minus, slash, dot, or hyphen.
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9+\-/.]*", text)
    return [token for token in tokens if len(token) >= 3]


def _basic_pos_tag(token: str) -> str:
    lower = token.lower()

    if re.search(r"\d", token):
        return "noun"
    if lower.endswith("ly"):
        return "adv"
    if lower.endswith(("ed", "ing")):
        return "verb"
    if lower.endswith(("ous", "ful", "able", "ible", "ive", "al", "ic", "ary")):
        return "adj"
    if lower.endswith(("tion", "ment", "ness", "ity", "ism", "ology", "ence", "ance")):
        return "noun"
    if token[0].isupper() and not lower.isupper():
        return "proper"
    return "noun"


def extract_named_entities(text: str) -> List[str]:
    """
    Extract PERSON/ORG/DATE/LOCATION entities while preserving the original spans.
    """
    sanitized = sanitize_text(text)
    if not sanitized:
        return []

    ner = _get_ner_pipeline()
    entities = ner(sanitized)

    allowed = {"PER", "ORG", "LOC", "MISC", "DATE"}
    seen = set()
    results = []
    for ent in entities:
        label = ent.get("entity_group") or ent.get("entity")
        if label not in allowed:
            continue
        entity_text = ent.get("word", "").strip()
        if not entity_text:
            continue
        if entity_text not in seen:
            seen.add(entity_text)
            results.append(entity_text)

    return results


def _score_terms(tokens: Iterable[str]) -> List[Tuple[str, float]]:
    counts = Counter(tokens)
    scores = []
    for token, count in counts.items():
        pos = _basic_pos_tag(token)
        pos_weight = 1.4 if pos in {"noun", "proper"} else 1.0
        length_weight = 1 + (len(token) / 8)
        scores.append((token, count * length_weight * pos_weight))
    return scores


def extract_key_concepts(text: str, limit: int = 8):
    sanitized = sanitize_text(text)
    if not sanitized:
        return []

    tokens = _tokenize_terms(sanitized)
    if not tokens:
        return []

    # Keep high-signal entities to anchor domain-neutral concepts.
    entities = extract_named_entities(sanitized)
    entity_tokens = [entity for entity in entities if len(entity) >= 3]

    scored = _score_terms(tokens + entity_tokens)
    scored.sort(key=lambda item: (item[1], len(item[0])), reverse=True)
    concepts = []
    seen = set()
    for token, _ in scored:
        lowered = token.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        concepts.append(token)
        if len(concepts) >= limit:
            break

    return concepts


def find_most_relevant_word(text: str) -> str:
    concepts = extract_key_concepts(text, limit=1)
    return concepts[0] if concepts else ""


def map_concepts_to_sentences(text: str, concepts):
    sentences = reconstruct_sentences(text)
    mapping = {concept: [] for concept in concepts}

    for concept in concepts:
        seen = set()
        for sentence in sentences:
            if concept.lower() in sentence.lower():
                key = sentence.lower()
                if key not in seen:
                    seen.add(key)
                    mapping[concept].append(sentence.strip())

    return mapping


def build_mindmap(text: str, title: str = "Main Topic"):
    concepts = extract_key_concepts(text)
    concept_map = map_concepts_to_sentences(text, concepts)

    nodes = [{"id": "root", "label": title}]
    edges = []

    for concept in concepts:
        node_id = f"node_{concept}"
        nodes.append({
            "id": node_id,
            "label": concept.capitalize()
        })

        edges.append({
            "from": "root",
            "to": node_id
        })

        for i, sentence in enumerate(concept_map[concept][:1]):
            detail_id = f"{node_id}_{i}"
            nodes.append({
                "id": detail_id,
                "label": sentence
            })

            edges.append({
                "from": node_id,
                "to": detail_id
            })

    return {
        "nodes": nodes,
        "edges": edges
    }
