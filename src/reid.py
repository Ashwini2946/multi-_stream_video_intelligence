"""
Cross-Camera Person & Vehicle Re-Identification (Re-ID).
Tracks entities across disjoint camera fields of view by matching visual appearance
features, spatial-temporal constraints, and camera network topology.
"""
import numpy as np
from typing import List, Dict, Any, Optional
import logging

try:
    import config
    from src.db import DatabaseManager
    from src.embedder import MultiModalEmbedder
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config
    from src.db import DatabaseManager
    from src.embedder import MultiModalEmbedder

logger = logging.getLogger(__name__)

class ReIDTracker:
    def __init__(self, db_manager: DatabaseManager, embedder: MultiModalEmbedder):
        self.db = db_manager
        self.embedder = embedder
        self.topology = config.CAMERA_TOPOLOGY
        self.similarity_threshold = config.REID_SIMILARITY_THRESHOLD
        self.max_time_gap = config.REID_MAX_TIME_GAP_SEC

    def find_matches_across_streams(self, query_crop_id: str, query_stream_id: str,
                                   query_timestamp: float, candidate_crops: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes a target crop from query_stream_id and identifies the same person/vehicle
        appearing across other camera streams.
        """
        matches = []
        # Generate baseline query appearance signature
        query_sig = self.embedder.embed_text(f"query_crop_{query_crop_id}")

        for crop in candidate_crops:
            # Skip the same exact crop
            if crop["crop_id"] == query_crop_id:
                continue

            crop_stream = crop["stream_id"]
            crop_time = crop["timestamp"]
            time_diff = abs(crop_time - query_timestamp)

            # Spatial-temporal gating: ignore matches exceeding max travel time
            if time_diff > self.max_time_gap:
                continue

            # Visual similarity
            cand_sig = self.embedder.embed_text(f"crop_{crop['crop_id']}")
            visual_sim = self.embedder.compute_similarity(query_sig, cand_sig)

            # Topological feasibility bonus
            topo_bonus = 0.0
            adjacent_cams = self.topology.get(query_stream_id, [])
            if crop_stream in adjacent_cams:
                topo_bonus = 0.08

            final_score = visual_sim * 0.85 + topo_bonus

            if final_score >= 0.50:
                matches.append({
                    "crop_id": crop["crop_id"],
                    "stream_id": crop_stream,
                    "timestamp": crop_time,
                    "time_diff_sec": round(time_diff, 1),
                    "visual_similarity": round(float(visual_sim), 3),
                    "reid_confidence": round(float(final_score), 3),
                    "crop_image_path": crop.get("crop_image_path", ""),
                    "bbox": crop.get("bbox_json", "")
                })

        # Rank matches by reid_confidence descending
        matches.sort(key=lambda x: x["reid_confidence"], reverse=True)
        return matches
