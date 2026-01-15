import re
from collections import Counter
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


def summarize_text(text: str) -> str:
    """
    Generate an academic-style summary from OCR text.
    """

    if not text or len(text.strip()) < 50:
        return "Text too short for summarization."

    # BART has token limits → chunk if needed
    max_chunk_length = 1000
    chunks = [
        text[i:i + max_chunk_length]
        for i in range(0, len(text), max_chunk_length)
    ]

    summaries = []

    for chunk in chunks:
        result = summarizer(
            chunk,
            max_length=150,
            min_length=60,
            do_sample=False
        )
        summaries.append(result[0]["summary_text"])

    return " ".join(summaries)

def simplify_text(text: str) -> str:
    """
    Simplify academic text into student-friendly explanation.
    """

    if not text or len(text.strip()) < 30:
        return text

    # T5 works best with task prefix
    input_text = "simplify: " + text

    result = simplifier(
        input_text,
        max_length=200,
        min_length=80,
        do_sample=False
    )

    return result[0]["generated_text"]

def extract_key_concepts(text: str, limit: int = 8):
    words = re.findall(r'\b[a-zA-Z]{5,}\b', text.lower())

    stopwords = {
        "which", "their", "there", "these", "those", "where",
        "about", "would", "could", "should", "through",
        "support", "general", "activity"
    }

    banned_suffixes = ("ed", "ing", "ive", "al", "ic", "ly")

    filtered = []
    for w in words:
        if w in stopwords:
            continue
        if w.endswith(banned_suffixes):
            continue
        if not w.isalpha():
            continue
        filtered.append(w)

    common = Counter(filtered).most_common(limit)
    return [word for word, _ in common]



def map_concepts_to_sentences(text: str, concepts):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    mapping = {concept: [] for concept in concepts}

    for concept in concepts:
        seen = set()
        for sentence in sentences:
            if concept in sentence.lower():
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
