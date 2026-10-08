"""
Baseline Retrieval Implementations.
Provides standard BM25 / lexical keyword matching baseline and raw dense vector baseline
to compare against our proposed multi-stream temporal reranking architecture.
"""
from typing import List, Dict, Any

class BaselineRetriever:
    def __init__(self, clips: List[Dict[str, Any]]):
        self.clips = clips

    def search_keyword_bm25_sim(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Lexical baseline: matches query terms against clip text descriptions/tags.
        """
        query_terms = set(query.lower().split())
        scored = []

        for clip in self.clips:
            text = (clip.get("caption", "") + " " + " ".join(clip.get("detected_objects", []))).lower()
            tokens = text.split()
            matched = sum(1 for q in query_terms if q in tokens)
            score = (matched / max(1, len(query_terms))) * 0.8
            scored.append((clip, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [{"clip": c, "score": round(s, 3)} for c, s in scored[:top_k]]
