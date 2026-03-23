import importlib
import re
import unicodedata
from collections import Counter
from typing import Iterable, List, Tuple
import os

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
_WORD_DICTIONARY = None


def _get_ner_pipeline():
    global _NER_PIPELINE
    if _NER_PIPELINE is None:
        _NER_PIPELINE = _load_ner_pipeline()
    return _NER_PIPELINE


def _load_word_dictionary() -> set:
    repo_root = os.path.dirname(os.path.dirname(__file__))
    wordlist_path = os.path.join(repo_root, "resources", "wordlist.txt")

    try:
        with open(wordlist_path, "r", encoding="utf-8") as handle:
            words = {
                line.strip().lower()
                for line in handle
                if line.strip().isalpha() and len(line.strip()) >= 3
            }
            return words
    except OSError:
        # Absolute last-resort fallback
        return {
            "larval", "digest", "pollen",
            "nectar", "honeydew", "enzyme", "storage", "energy"
        }


def _get_word_dictionary() -> set:
    global _WORD_DICTIONARY
    if _WORD_DICTIONARY is None:
        _WORD_DICTIONARY = _load_word_dictionary()
    return _WORD_DICTIONARY


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


def _match_case(source: str, candidate: str) -> str:
    if source.isupper():
        return candidate.upper()
    if source.istitle():
        return candidate.capitalize()
    return candidate


def _has_technical_shape(token: str) -> bool:
    # Avoid mutating tokens that look technical or formatted identifiers.
    return bool(
        re.search(r"\d", token)
        or re.search(r"[A-Z].*[A-Z]", token)
        or re.search(r"[+/_\\-]", token)
    )


def lexical_repair(text: str) -> str:
    """
    Fix high-confidence OCR typos using conservative, dictionary-backed heuristics.
    """
    if not text:
        return ""

    dictionary = _get_word_dictionary()
    tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text)
    local_counts = Counter(token.lower() for token in tokens)

    confusion_pairs = [
        ("rn", "m"),
        ("m", "rn"),
        ("cl", "d"),
        ("d", "cl"),
        ("0", "o"),
        ("1", "l"),
        ("5", "s"),
        ("l", "i"),
        ("i", "l"),
        ("v", "u"),
        ("u", "v"),
        ("f", "t"),
        ("t", "f"),
    ]

    suffix_fixes = {
        "onc": "olic",
        "ual": "val",
        "rnal": "rmal",
    }

    def split_candidate(token: str) -> str:
        if len(token) < 8:
            return ""
        for idx in range(3, len(token) - 2):
            left = token[:idx]
            right = token[idx:]
            if (
                (left in dictionary or local_counts[left] > 1)
                and (right in dictionary or local_counts[right] > 1)
            ):
                return f"{left} {right}"
        return ""

    def replacement_candidate(token: str) -> str:
        for wrong, right in confusion_pairs:
            if wrong in token:
                candidate = token.replace(wrong, right, 1)
                if candidate in dictionary:
                    return candidate
        for wrong, right in suffix_fixes.items():
            if token.endswith(wrong):
                candidate = token[: -len(wrong)] + right
                if candidate in dictionary:
                    return candidate
        for idx in range(len(token)):
            candidate = token[:idx] + token[idx + 1:]
            if len(candidate) >= 3 and candidate in dictionary:
                return candidate
        return ""

    def repair_token(match: re.Match) -> str:
        original = match.group(0)
        if _has_technical_shape(original):
            return original
        lower = original.lower()
        if lower in dictionary or local_counts[lower] > 1:
            return original

        candidate = replacement_candidate(lower)
        if candidate:
            return _match_case(original, candidate)
        
        split = split_candidate(lower)
        if split:
            parts = split.split()
            return " ".join(_match_case(original, part) for part in parts)

        return original

    return re.sub(r"\b[a-zA-Z]{3,}\b", repair_token, text)


def reconstruct_sentences(text: str, sanitized: bool = False) -> List[str]:
    """
    Rebuild sentences from noisy line-broken OCR/PDF text.
    """
    cleaned = text if sanitized else sanitize_text(text)
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


def _expand_summary_if_thin(summary: str, sentences: List[str], min_concepts: int = 3) -> str:
    """
    Add a small amount of source context when summaries are too concept-light.
    """
    if not summary or not sentences:
        return summary

    concepts = extract_key_concepts(summary, limit=8)
    if len(concepts) >= min_concepts:
        return summary

    source_concepts = extract_key_concepts(" ".join(sentences), limit=10)
    if not source_concepts:
        return summary

    summary_lower = summary.lower()
    candidates = []
    for sentence in sentences:
        if sentence.lower() in summary_lower:
            continue
        score = sum(1 for concept in source_concepts if concept.lower() in sentence.lower())
        if score:
            candidates.append((score, sentence))

    if not candidates:
        return summary

    candidates.sort(key=lambda item: item[0], reverse=True)
    additions = [sentence for _, sentence in candidates[:2]]
    return f"{summary} {' '.join(additions)}".strip()


def summarize_text(text: str) -> str:
    """
    Generate an academic-style summary from sanitized, reconstructed text.
    """
    if not text or len(text.strip()) < 50:
        return "Text too short for summarization."

    sanitized = sanitize_text(text)
    repaired = lexical_repair(sanitized)
    sentences = reconstruct_sentences(repaired, sanitized=True)
    if not sentences:
        return "Text too short for summarization."

    chunks = chunk_sentences(sentences)
    summaries = [_summarize_chunk(chunk) for chunk in chunks]

    merged = " ".join(summaries).strip()
    if len(summaries) > 1 and _estimate_word_count(merged) > 220:
        # Light second-pass summarization stabilizes multi-chunk outputs.
        merged = _summarize_chunk(merged)

    return _expand_summary_if_thin(merged, sentences)


def summary_to_points(summary: str) -> List[str]:
    """
    Convert summary prose into clean, de-duplicated study points.
    """
    cleaned = sanitize_text(summary)
    if not cleaned:
        return []

    sentences = reconstruct_sentences(cleaned, sanitized=True)
    if not sentences:
        return []

    points: List[str] = []
    buffer = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if buffer:
            sentence = f"{buffer} {sentence}"
            buffer = ""
        if len(sentence.split()) < 6:
            buffer = sentence
            continue
        points.append(sentence)

    if buffer:
        if points:
            points[-1] = f"{points[-1]} {buffer}"
        else:
            points.append(buffer)

    seen = set()
    final_points = []
    for sentence in points:
        normalized = re.sub(r"[^a-z0-9]+", " ", sentence.lower()).strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        if not re.search(r"[.!?]$", sentence):
            sentence = f"{sentence}."
        final_points.append(sentence)

    return final_points


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


COMMON_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "because", "been", "being",
    "between", "both", "but", "by", "can", "could", "did", "do", "does",
    "during", "each", "for", "from", "had", "has", "have", "how", "if", "in",
    "into", "is", "it", "its", "may", "more", "most", "not", "of", "on", "or",
    "our", "over", "same", "should", "since", "so", "than", "that", "the",
    "their", "there", "these", "this", "those", "through", "to", "under", "until",
    "up", "using", "via", "was", "were", "what", "when", "where", "which", "while",
    "who", "why", "with", "within", "without", "you", "your"
}

PREPOSITIONS = {
    "about", "above", "across", "after", "against", "along", "among", "around",
    "before", "behind", "below", "beneath", "beside", "besides", "beyond", "despite",
    "down", "except", "inside", "near", "off", "onto", "outside", "past", "per",
    "throughout", "toward", "towards", "under", "underneath", "unlike", "upon"
}

BLOCKED_CONCEPTS = COMMON_STOPWORDS | PREPOSITIONS | {
    "generated", "concept", "concepts", "example", "examples", "note", "notes",
    "summary", "study", "student", "students", "topic", "topics"
}


def _load_keyword_extractor():
    yake = importlib.import_module("yake")

    return yake.KeywordExtractor(
        lan="en",
        n=3,
        dedupLim=0.85,
        dedupFunc="seqm",
        windowsSize=2,
        top=20,
    )


_KEYWORD_EXTRACTOR = None


def _get_keyword_extractor():
    global _KEYWORD_EXTRACTOR
    if _KEYWORD_EXTRACTOR is None:
        _KEYWORD_EXTRACTOR = _load_keyword_extractor()
    return _KEYWORD_EXTRACTOR


def _normalize_concept_label(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9+\-/. ]+", " ", value or "")
    normalized = re.sub(r"\s+", " ", normalized).strip(" .,:;!?-_")
    return normalized


def _concept_tokens(value: str) -> List[str]:
    return [token.lower() for token in re.findall(r"[A-Za-z][A-Za-z0-9+\-/.]*", value)]


def _is_valid_concept(candidate: str) -> bool:
    normalized = _normalize_concept_label(candidate)
    if not normalized:
        return False

    tokens = _concept_tokens(normalized)
    if not tokens or len(tokens) > 4:
        return False

    if all(token in BLOCKED_CONCEPTS for token in tokens):
        return False

    informative_tokens = [token for token in tokens if token not in BLOCKED_CONCEPTS]
    if not informative_tokens:
        return False

    if len(informative_tokens) == 1 and len(informative_tokens[0]) < 4:
        return False

    return True


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
        entity_text = _normalize_concept_label(ent.get("word", ""))
        if not _is_valid_concept(entity_text):
            continue
        key = entity_text.lower()
        if key not in seen:
            seen.add(key)
            results.append(entity_text)

    return results


def _score_terms(tokens: Iterable[str]) -> List[Tuple[str, float]]:
    counts = Counter(tokens)
    scores = []
    for token, count in counts.items():
        if token.lower() in BLOCKED_CONCEPTS:
            continue
        pos = _basic_pos_tag(token)
        if pos in {"adv", "verb"}:
            continue
        pos_weight = 1.5 if pos in {"noun", "proper"} else 1.0
        length_weight = 1 + min(len(token), 18) / 10
        scores.append((token, count * length_weight * pos_weight))
    return scores


def _extract_keyword_phrases(text: str) -> List[str]:
    sanitized = sanitize_text(text)
    if not sanitized:
        return []

    try:
        extractor = _get_keyword_extractor()
        raw_phrases = extractor.extract_keywords(sanitized)
    except Exception as exc:
        print(f"Keyword extraction fallback enabled: {exc}")
        return []

    phrases = []
    for phrase, score in raw_phrases:
        if score > 0.3:
            continue
        normalized = _normalize_concept_label(phrase)
        if _is_valid_concept(normalized):
            phrases.append(normalized)
    return phrases


def extract_key_concepts(text: str, limit: int = 8):
    sanitized = sanitize_text(text)
    if not sanitized:
        return []

    keyword_phrases = _extract_keyword_phrases(sanitized)
    tokens = [token for token in _tokenize_terms(sanitized) if token.lower() not in BLOCKED_CONCEPTS]
    entities = extract_named_entities(sanitized)

    scored_tokens = _score_terms(tokens)
    scored_tokens.sort(key=lambda item: (item[1], len(item[0])), reverse=True)

    candidates = []
    candidates.extend(keyword_phrases)
    candidates.extend(entities)
    candidates.extend(token for token, _ in scored_tokens)

    concepts = []
    seen = set()
    for candidate in candidates:
        normalized = _normalize_concept_label(candidate)
        if not _is_valid_concept(normalized):
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        concepts.append(normalized)
        if len(concepts) >= limit:
            break

    return concepts


def _sentence_match_score(sentence: str, concept: str) -> float:
    sentence_lower = sentence.lower()
    concept_lower = concept.lower()
    if concept_lower in sentence_lower:
        return 10.0

    concept_tokens = [token for token in _concept_tokens(concept) if token not in BLOCKED_CONCEPTS]
    if not concept_tokens:
        return 0.0

    score = 0.0
    for token in concept_tokens:
        if re.search(rf"\b{re.escape(token)}\b", sentence_lower):
            score += 1.5
    return score


def _slugify_node_id(label: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-") or "concept"


def map_concepts_to_sentences(text: str, concepts):
    sentences = reconstruct_sentences(text)
    mapping = {concept: [] for concept in concepts}

    for concept in concepts:
        ranked = []
        seen = set()
        for sentence in sentences:
            score = _sentence_match_score(sentence, concept)
            if score <= 0:
                continue
            key = sentence.lower()
            if key in seen:
                continue
            seen.add(key)
            ranked.append((score, sentence.strip()))

        ranked.sort(key=lambda item: (item[0], len(item[1])), reverse=True)
        mapping[concept] = [sentence for _, sentence in ranked[:2]]

    return mapping


def build_mindmap(text: str, title: str = "Main Topic"):
    concepts = extract_key_concepts(text, limit=6)
    concept_map = map_concepts_to_sentences(text, concepts)

    nodes = [{"id": "root", "label": _normalize_concept_label(title) or "Main Topic"}]
    edges = []

    for concept in concepts:
        concept_slug = _slugify_node_id(concept)
        node_id = f"node_{concept_slug}"
        nodes.append({
            "id": node_id,
            "label": concept
        })

        edges.append({
            "from": "root",
            "to": node_id
        })

        for i, sentence in enumerate(concept_map[concept][:2]):
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


def find_most_relevant_word(text: str) -> str:
    concepts = extract_key_concepts(text, limit=1)
    return concepts[0] if concepts else ""
