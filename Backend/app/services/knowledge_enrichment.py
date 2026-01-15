import requests
import urllib.parse

# --- Constants ---
SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
SEARCH_API = "https://en.wikipedia.org/w/api.php"
HEADERS = {
    "User-Agent": "NexaSense/1.0",
    "Accept-Language": "en"
}

def get_wiki_title(query):
    """
    Finds the best matching Wikipedia title using OpenSearch.
    This fixes typos (e.g., 'Metabonc' -> 'Metabolism') and redirects.
    """
    try:
        params = {
            "action": "opensearch",
            "format": "json",
            "search": query,
            "limit": 1
        }
        response = requests.get(SEARCH_API, params=params, headers=HEADERS, timeout=5)
        data = response.json()
        
        # OpenSearch returns: [query, [titles], [descriptions], [urls]]
        if data and len(data) > 1 and data[1]:
            return data[1][0]  # Return the first matching title
        return None
    except Exception as e:
        print(f"Wiki Search Error for '{query}': {e}")
        return None

def fetch_summary(topic):
    """
    Fetches the summary for a specific topic.
    """
    clean_topic = topic.strip()
    
    # 1. Search first to get the correct title (fixes typos/plurals)
    best_title = get_wiki_title(clean_topic)
    
    if not best_title:
        return None

    try:
        # 2. Fetch the REST V1 summary using the correct title
        encoded_title = urllib.parse.quote(best_title.replace(" ", "_"))
        url = f"{SUMMARY_API}{encoded_title}"
        
        response = requests.get(url, headers=HEADERS, timeout=5)
        
        if response.status_code == 200:
            return response.json().get("extract")
        return None
    except Exception as e:
        print(f"Wiki Fetch Error for '{topic}': {e}")
        return None

def enrich_summary(original_summary: str, concepts: list):
    """
    Main function called by notes.py.
    Arguments:
      original_summary (str): The text summary of the note.
      concepts (list): A list of strings (keywords) to look up.
    """
    enriched_points = []
    
    # Remove duplicates and ensure we iterate over a clean list
    unique_concepts = set(concepts)

    print(f"DEBUG: Enriching concepts: {unique_concepts}")

    for concept in unique_concepts:
        # Filter: Skip if the concept is a long sentence (heuristic > 3 words)
        # or if it's the root node label
        if len(concept.split()) > 3 or concept == "Generated Concepts":
            continue

        wiki_text = fetch_summary(concept)

        if wiki_text:
            enriched_points.append({
                "concept": concept,
                "verified_info": wiki_text
            })

    return {
        "original_summary": original_summary,
        "enriched_content": enriched_points
    }