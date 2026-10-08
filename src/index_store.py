"""
Vector Index Store.
Maintains FAISS / numpy inner product vector indexes for fast approximate
nearest-neighbor (ANN) retrieval over multi-stream video clips.
"""
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import json
import logging

try:
    import config
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config

logger = logging.getLogger(__name__)

class VectorIndexStore:
    def __init__(self, index_path: Optional[Path] = None, dim: int = config.EMBEDDING_DIM):
        self.index_path = index_path or config.FAISS_INDEX_PATH
        self.dim = dim
        self.vectors: List[np.ndarray] = []
        self.metadata_list: List[Dict[str, Any]] = []

    def add(self, vector: np.ndarray, metadata: Dict[str, Any]) -> int:
        """Adds a normalized vector and its associated clip/crop metadata."""
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        idx = len(self.vectors)
        self.vectors.append(vector)
        self.metadata_list.append(metadata)
        return idx

    def search(self, query_vector: np.ndarray, top_k: int = 10, filter_stream_id: Optional[str] = None) -> List[Tuple[Dict[str, Any], float]]:
        """
        Executes inner product (cosine similarity) search against all stored vectors.
        Returns ranked list of (metadata, score).
        """
        if not self.vectors:
            return []

        matrix = np.stack(self.vectors)  # [N, dim]
        q_norm = np.linalg.norm(query_vector)
        if q_norm > 0:
            query_vector = query_vector / q_norm

        scores = np.dot(matrix, query_vector)  # [N]
        ranked_indices = np.argsort(scores)[::-1]

        results = []
        for idx in ranked_indices:
            meta = self.metadata_list[idx]
            if filter_stream_id and meta.get("stream_id") != filter_stream_id:
                continue

            results.append((meta, float(scores[idx])))
            if len(results) >= top_k:
                break

        return results

    def count(self) -> int:
        return len(self.vectors)
