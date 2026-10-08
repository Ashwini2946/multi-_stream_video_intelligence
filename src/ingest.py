"""
Video Ingestion module for Multi-Stream Video Intelligence.
Handles manual video addition by users, file uploads via Streamlit / API,
format conversion, frame probing, and persistent registration in SQLite.
"""
import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import cv2
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

class VideoIngestor:
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager(config.DB_PATH)
        self.videos_dir = config.VIDEOS_DIR
        self.videos_dir.mkdir(parents=True, exist_ok=True)

    def probe_video_file(self, file_path: Path) -> Dict[str, Any]:
        """Reads video metadata using OpenCV."""
        cap = cv2.VideoCapture(str(file_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video source: {file_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0.0

        cap.release()

        return {
            "fps": round(fps, 2),
            "frame_count": frame_count,
            "duration": round(duration, 2),
            "resolution": f"{width}x{height}",
            "width": width,
            "height": height
        }

    def ingest_uploaded_file(self, uploaded_file, custom_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Accepts a Streamlit UploadedFile or file buffer, saves it to data/videos/,
        probes metadata, and registers in the database.
        """
        original_filename = getattr(uploaded_file, "name", "uploaded_stream.mp4")
        ext = Path(original_filename).suffix.lower()
        if ext not in config.ALLOWED_EXTENSIONS:
            ext = ".mp4"

        stream_id = f"cam_{uuid.uuid4().hex[:8]}"
        name = custom_name or Path(original_filename).stem
        target_path = self.videos_dir / f"{stream_id}{ext}"

        # Save buffer to disk
        with open(target_path, "wb") as f:
            if hasattr(uploaded_file, "getbuffer"):
                f.write(uploaded_file.getbuffer())
            elif hasattr(uploaded_file, "read"):
                f.write(uploaded_file.read())
            else:
                raise TypeError("Unsupported file object type")

        # Probe video
        meta = self.probe_video_file(target_path)

        # Register in DB
        self.db.insert_stream(
            stream_id=stream_id,
            name=name,
            source_type="upload",
            file_path=str(target_path),
            fps=meta["fps"],
            duration=meta["duration"],
            resolution=meta["resolution"],
            metadata={"original_filename": original_filename, "file_size": target_path.stat().st_size}
        )

        return {
            "stream_id": stream_id,
            "name": name,
            "file_path": str(target_path),
            "meta": meta
        }

    def ingest_manual_stream(self, stream_url: str, name: str, source_type: str = "url") -> Dict[str, Any]:
        """
        Manually adds an external stream URL, RTSP link, or network camera stream.
        """
        stream_id = f"cam_{uuid.uuid4().hex[:8]}"
        self.db.insert_stream(
            stream_id=stream_id,
            name=name,
            source_type=source_type,
            file_path=stream_url,
            fps=30.0,
            duration=0.0,
            resolution="1920x1080",
            metadata={"stream_url": stream_url}
        )

        return {
            "stream_id": stream_id,
            "name": name,
            "file_path": stream_url,
            "meta": {"fps": 30.0, "duration": 0.0, "resolution": "1920x1080"}
        }
