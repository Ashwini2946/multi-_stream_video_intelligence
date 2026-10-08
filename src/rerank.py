"""
Temporal and Semantic Re-ranker.
Refines candidate retrieval results using cross-modal re-scoring,
temporal consistency window smoothing, and multi-camera co-occurrence penalties.
"""
from typing import List, Dict, Any
import numpy as np

try:
    import config
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config

class Reranker:
    def __init__(self, alpha: float = config.RERANK_ALPHA):
        self.alpha = alpha

    def rerank(self, query: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Re-ranks video clips by blending visual dense similarity with temporal coherence boost.
        """
        if not candidates:
            return []

        reranked = []
        lowered_query = query.lower()

        for idx, item in enumerate(candidates):
            base_score = item.get("score", 0.5)

            # Keyword lexical match bonus
            lexical_boost = 0.0
            caption = (item.get("caption") or "").lower()
            for word in lowered_query.split():
                if len(word) > 2 and word in caption:
                    lexical_boost += 0.06

            # Temporal adjacency bonus: sequential clips from the same stream
            temporal_bonus = 0.0
            if idx > 0 and candidates[idx - 1].get("stream_id") == item.get("stream_id"):
                prev_end = candidates[idx - 1].get("end_time", 0.0)
                curr_start = item.get("start_time", 0.0)
                if abs(curr_start - prev_end) <= 2.0:
                    temporal_bonus = 0.08

            final_score = (self.alpha * base_score) + ((1 - self.alpha) * min(1.0, base_score + lexical_boost + temporal_bonus))

            item_copy = dict(item)
            item_copy["original_score"] = base_score
            item_copy["score"] = round(float(final_score), 4)
            item_copy["reranked"] = True
            reranked.append(item_copy)

        reranked.sort(key=lambda x: x["score"], reverse=True)
        return reranked
