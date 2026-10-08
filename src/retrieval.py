"""
Natural Language Temporal Retrieval.
Converts user natural language search queries (e.g. 'person in dark hoodie walking past fence')
into vector representations, queries the vector index, and filters across time and camera zones.
"""
from typing import List, Dict, Any, Optional
import time
import numpy as np

try:
    import config
    from src.embedder import MultiModalEmbedder
    from src.index_store import VectorIndexStore
    from src.db import DatabaseManager
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config
    from src.embedder import MultiModalEmbedder
    from src.index_store import VectorIndexStore
    from src.db import DatabaseManager

class TemporalRetrievalEngine:
    def __init__(self, embedder: MultiModalEmbedder, index_store: VectorIndexStore, db_manager: DatabaseManager):
        self.embedder = embedder
        self.index = index_store
        self.db = db_manager

    def search(self, query_text: str, top_k: int = 10,
               filter_stream_id: Optional[str] = None,
               time_range: Optional[tuple] = None) -> Dict[str, Any]:
        """
        Executes multi-stream video search for a natural language query.
        Returns matched clips ranked by relevance score with execution latency.
        """
        t0 = time.time()
        query_vec = self.embedder.embed_text(query_text)

        raw_results = self.index.search(query_vec, top_k=top_k * 2, filter_stream_id=filter_stream_id)

        filtered = []
        for meta, score in raw_results:
            if time_range:
                start_t, end_t = time_range
                clip_start = meta.get("start_time", 0.0)
                if clip_start < start_t or clip_start > end_t:
                    continue

            filtered.append({
                "clip_id": meta.get("clip_id"),
                "stream_id": meta.get("stream_id"),
                "start_time": meta.get("start_time"),
                "end_time": meta.get("end_time"),
                "caption": meta.get("caption"),
                "score": round(float(score), 4),
                "keyframe_path": meta.get("keyframe_path", ""),
                "detected_objects": meta.get("detected_objects", [])
            })

            if len(filtered) >= top_k:
                break

        latency_ms = (time.time() - t0) * 1000

        # Log query to database
        self.db.log_query(
            query_text=query_text,
            results_count=len(filtered),
            latency_ms=latency_ms,
            selected_clip_id=filtered[0]["clip_id"] if filtered else None
        )

        return {
            "query": query_text,
            "results": filtered,
            "latency_ms": round(latency_ms, 2),
            "total_matches": len(filtered)
        }
