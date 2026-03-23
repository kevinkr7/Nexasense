import importlib
import re
from typing import Iterable, List


def _clean_query(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _format_duration(seconds: int | None) -> str:
    if not seconds or seconds < 1:
        return "Duration unavailable"
    minutes, remaining_seconds = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m {remaining_seconds:02d}s"


def _build_queries(topic: str, concepts: Iterable[str]) -> List[str]:
    concept_list = [_clean_query(concept) for concept in concepts if _clean_query(concept)]
    primary = _clean_query(topic) or (concept_list[0] if concept_list else "study topic")

    queries = [
        f"{primary} explained",
        f"{primary} tutorial",
    ]

    for concept in concept_list[:3]:
        if concept.lower() == primary.lower():
            continue
        queries.append(f"{concept} explained")

    seen = set()
    unique_queries = []
    for query in queries:
        normalized = query.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_queries.append(query)
    return unique_queries[:4]


def fetch_youtube_videos(topic: str, concepts: Iterable[str], limit: int = 5) -> List[dict]:
    queries = _build_queries(topic, concepts)
    if not queries:
        return []

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "noplaylist": True,
    }

    results = []
    seen_urls = set()

    try:
        youtube_dl_module = importlib.import_module("yt_dlp")
        youtube_dl = youtube_dl_module.YoutubeDL
        with youtube_dl(ydl_opts) as ydl:
            for query in queries:
                info = ydl.extract_info(f"ytsearch3:{query}", download=False)
                entries = info.get("entries") or []
                for entry in entries:
                    url = entry.get("webpage_url") or entry.get("url")
                    if not url or url in seen_urls:
                        continue

                    duration_seconds = entry.get("duration")
                    if duration_seconds and duration_seconds < 120:
                        # Skip shorts/snippets because they are usually low-value study material.
                        continue

                    thumbnails = entry.get("thumbnails") or []
                    thumbnail_url = ""
                    if thumbnails:
                        thumbnail_url = thumbnails[-1].get("url") or thumbnails[0].get("url") or ""

                    seen_urls.add(url)
                    results.append({
                        "id": entry.get("id") or re.sub(r"\W+", "-", query.lower()).strip("-"),
                        "title": entry.get("title") or query,
                        "url": url,
                        "channel": entry.get("channel") or entry.get("uploader") or "YouTube",
                        "duration": _format_duration(duration_seconds),
                        "thumbnail": thumbnail_url,
                        "description": (
                            entry.get("description")
                            or f"Video result for '{query}' matched to your uploaded study material."
                        ),
                        "query": query,
                    })
                    if len(results) >= limit:
                        return results
    except Exception as exc:
        print(f"YouTube lookup failed: {exc}")
        return []

    return results
