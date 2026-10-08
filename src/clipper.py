"""
Video Clipper & Crop Extractor.
Slices ingested surveillance streams into temporal segments (e.g. 5-second overlapping clips)
and crops detected objects (person/car) into individual crop images for Re-ID.
"""
from pathlib import Path
import cv2
import uuid
from typing import List, Dict, Any, Tuple
import logging

try:
    import config
    from src.db import DatabaseManager
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config
    from src.db import DatabaseManager

logger = logging.getLogger(__name__)

class VideoClipper:
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.clips_dir = config.CLIPS_DIR
        self.crops_dir = config.CROPS_DIR
        self.clips_dir.mkdir(parents=True, exist_ok=True)
        self.crops_dir.mkdir(parents=True, exist_ok=True)

    def slice_stream_into_clips(self, stream_id: str, video_path: str, duration: float) -> List[Dict[str, Any]]:
        """
        Segments video into temporal clips based on CLIP_DURATION_SEC and CLIP_OVERLAP_SEC.
        Generates keyframes and clip records in the database.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return []

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration = total_frames / fps if fps > 0 else duration

        clip_window = config.CLIP_DURATION_SEC
        step = max(1, clip_window - config.CLIP_OVERLAP_SEC)

        created_clips = []
        current_time = 0.0

        while current_time < video_duration:
            end_time = min(video_duration, current_time + clip_window)
            clip_id = f"clip_{stream_id}_{int(current_time)}_{int(end_time)}"

            # Seek to midpoint for keyframe
            mid_time = (current_time + end_time) / 2.0
            cap.set(cv2.CAP_PROP_POS_MSEC, mid_time * 1000)
            ret, frame = cap.read()

            keyframe_path = self.clips_dir / f"{clip_id}_keyframe.jpg"
            if ret and frame is not None:
                cv2.imwrite(str(keyframe_path), frame)
            else:
                keyframe_path = ""

            clip_record = {
                "clip_id": clip_id,
                "stream_id": stream_id,
                "clip_path": str(video_path),
                "start_time": round(current_time, 2),
                "end_time": round(end_time, 2),
                "keyframe_path": str(keyframe_path),
                "caption": f"Surveillance activity on {stream_id} between {int(current_time)}s and {int(end_time)}s",
                "objects": ["person", "vehicle"]
            }

            self.db.insert_clip(
                clip_id=clip_record["clip_id"],
                stream_id=clip_record["stream_id"],
                clip_path=clip_record["clip_path"],
                start_time=clip_record["start_time"],
                end_time=clip_record["end_time"],
                keyframe_path=clip_record["keyframe_path"],
                caption=clip_record["caption"],
                objects=clip_record["objects"]
            )

            created_clips.append(clip_record)
            current_time += step

        cap.release()
        return created_clips

    def extract_crop(self, frame: cv2.Mat, bbox: List[float], stream_id: str, clip_id: str, timestamp: float, obj_class: str = "person") -> str:
        """
        Crops object bounding box [x, y, w, h] from frame and saves image to data/crops/.
        """
        h, w = frame.shape[:2]
        bx, by, bw, bh = bbox

        # Convert normalized to pixel coordinates with margin
        margin = config.EXPAND_CROP_BOX_RATIO
        x1 = max(0, int((bx - margin) * w))
        y1 = max(0, int((by - margin) * h))
        x2 = min(w, int((bx + bw + margin) * w))
        y2 = min(h, int((by + bh + margin) * h))

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return ""

        crop_id = f"crop_{uuid.uuid4().hex[:8]}"
        crop_path = self.crops_dir / f"{crop_id}.jpg"
        cv2.imwrite(str(crop_path), crop)

        self.db.insert_crop(
            crop_id=crop_id,
            clip_id=clip_id,
            stream_id=stream_id,
            timestamp=timestamp,
            object_class=obj_class,
            confidence=0.88,
            bbox=bbox,
            crop_path=str(crop_path)
        )

        return str(crop_path)
