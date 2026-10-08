"""
Spatial-Temporal Memory Graph.
Maintains situational awareness across multiple camera streams over time.
Associates tracks, alerts, zone entries, and multi-camera transitions.
"""
from typing import Dict, List, Any, Optional
from collections import defaultdict
import time

class SpatioTemporalMemory:
    def __init__(self):
        # camera_id -> list of timestamped events
        self.camera_events = defaultdict(list)
        # entity_id -> list of sightings across cameras
        self.trajectories = defaultdict(list)

    def record_event(self, stream_id: str, timestamp: float, event_type: str, details: Dict[str, Any]):
        event = {
            "stream_id": stream_id,
            "timestamp": timestamp,
            "event_type": event_type,
            "details": details,
            "recorded_at": time.time()
        }
        self.camera_events[stream_id].append(event)
        return event

    def record_sighting(self, entity_id: str, stream_id: str, timestamp: float, crop_id: str, confidence: float):
        sighting = {
            "entity_id": entity_id,
            "stream_id": stream_id,
            "timestamp": timestamp,
            "crop_id": crop_id,
            "confidence": confidence
        }
        self.trajectories[entity_id].append(sighting)
        # Sort chronologically
        self.trajectories[entity_id].sort(key=lambda s: s["timestamp"])
        return sighting

    def get_trajectory(self, entity_id: str) -> List[Dict[str, Any]]:
        return self.trajectories.get(entity_id, [])

    def get_timeline_summary(self, stream_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if stream_id:
            return self.camera_events.get(stream_id, [])
        all_events = []
        for events in self.camera_events.values():
            all_events.extend(events)
        all_events.sort(key=lambda e: e["timestamp"])
        return all_events
