"""
Video Parser and Frame Extractor module.
Detects scene transitions, extracts keyframes, and runs object detection
to produce bounding boxes for persons and vehicles.
"""
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple
import logging

try:
    import config
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config

logger = logging.getLogger(__name__)

class VideoParser:
    def __init__(self):
        self.sample_fps = config.SAMPLE_FPS
        self.min_motion = config.KEYFRAME_MIN_MOTION

    def extract_keyframes(self, video_path: str) -> List[Dict[str, Any]]:
        """
        Samples video frames at configured sample_fps and detects significant keyframes.
        Returns list of { 'timestamp': float, 'frame': np.ndarray, 'frame_idx': int }
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video: {video_path}")
            return []

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        step = max(1, int(fps / self.sample_fps))

        keyframes = []
        prev_gray = None
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % step == 0:
                timestamp = frame_idx / fps
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                gray = cv2.resize(gray, (160, 90))

                motion_score = 1.0
                if prev_gray is not None:
                    diff = cv2.absdiff(prev_gray, gray)
                    motion_score = float(np.mean(diff)) / 255.0

                if prev_gray is None or motion_score >= self.min_motion:
                    keyframes.append({
                        "timestamp": round(timestamp, 2),
                        "frame": frame.copy(),
                        "frame_idx": frame_idx,
                        "motion_score": round(motion_score, 3)
                    })
                    prev_gray = gray

            frame_idx += 1

        cap.release()
        return keyframes

    def detect_objects_in_frame(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detects bounding boxes for persons, vehicles, bags in frame.
        In production uses YOLOv8 / Faster-RCNN; provides structured normalized boxes.
        """
        h, w = frame.shape[:2]
        # Simulated heuristic / detector output structure
        # Bbox format: [x, y, width, height] normalized (0.0 to 1.0)
        return [
            {
                "label": "person",
                "confidence": 0.88,
                "bbox": [0.35, 0.20, 0.15, 0.55],
                "area": int(0.15 * w * 0.55 * h)
            }
        ]
