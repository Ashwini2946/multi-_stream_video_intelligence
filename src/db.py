"""
Database module for Multi-Stream Video Intelligence.
Manages SQLite storage for camera streams, temporal clips, detected object crops,
vector metadata, and cross-camera Re-ID associations.
"""
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initializes tables for streams, clips, crops, events, and audit logs."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Streams Table (holds uploaded and manual video streams)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS streams (
                stream_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                source_type TEXT NOT NULL, -- 'upload', 'url', 'rtsp', 'preset'
                file_path TEXT,
                fps REAL DEFAULT 30.0,
                duration REAL DEFAULT 0.0,
                resolution TEXT DEFAULT '1920x1080',
                status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'INDEXING', 'COMPLETED', 'FAILED'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata JSON
            )
            """)

            # Clips Table (temporal sub-clips with timestamps and captions)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS clips (
                clip_id TEXT PRIMARY KEY,
                stream_id TEXT NOT NULL,
                clip_path TEXT,
                start_time REAL NOT NULL,
                end_time REAL NOT NULL,
                keyframe_path TEXT,
                caption TEXT,
                summary TEXT,
                detected_objects TEXT, -- JSON array of detected labels
                embedding_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(stream_id) REFERENCES streams(stream_id) ON DELETE CASCADE
            )
            """)

            # Crops Table (detected person/vehicle bounding box crops for Re-ID)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS crops (
                crop_id TEXT PRIMARY KEY,
                clip_id TEXT NOT NULL,
                stream_id TEXT NOT NULL,
                timestamp REAL NOT NULL,
                object_class TEXT NOT NULL, -- 'person', 'car', 'truck', etc.
                confidence REAL NOT NULL,
                bbox_json TEXT NOT NULL, -- [x, y, w, h] normalized
                crop_image_path TEXT,
                reid_signature TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(clip_id) REFERENCES clips(clip_id) ON DELETE CASCADE,
                FOREIGN KEY(stream_id) REFERENCES streams(stream_id) ON DELETE CASCADE
            )
            """)

            # Events & Search Queries Log
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS queries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_text TEXT NOT NULL,
                results_count INTEGER,
                latency_ms REAL,
                selected_clip_id TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            conn.commit()

    def insert_stream(self, stream_id: str, name: str, source_type: str, file_path: str,
                      fps: float = 30.0, duration: float = 0.0, resolution: str = "1920x1080",
                      metadata: Optional[Dict[str, Any]] = None) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO streams (stream_id, name, source_type, file_path, fps, duration, resolution, status, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
            """, (stream_id, name, source_type, file_path, fps, duration, resolution, json.dumps(metadata or {})))
            conn.commit()
            return True

    def get_all_streams(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM streams ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def delete_stream(self, stream_id: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM crops WHERE stream_id = ?", (stream_id,))
            cursor.execute("DELETE FROM clips WHERE stream_id = ?", (stream_id,))
            cursor.execute("DELETE FROM streams WHERE stream_id = ?", (stream_id,))
            conn.commit()

    def insert_clip(self, clip_id: str, stream_id: str, clip_path: str, start_time: float,
                    end_time: float, keyframe_path: str, caption: str, objects: List[str],
                    embedding_id: Optional[int] = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO clips (clip_id, stream_id, clip_path, start_time, end_time, keyframe_path, caption, detected_objects, embedding_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (clip_id, stream_id, clip_path, start_time, end_time, keyframe_path, caption, json.dumps(objects), embedding_id))
            conn.commit()

    def get_clips_for_stream(self, stream_id: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM clips WHERE stream_id = ? ORDER BY start_time ASC", (stream_id,))
            return [dict(row) for row in cursor.fetchall()]

    def insert_crop(self, crop_id: str, clip_id: str, stream_id: str, timestamp: float,
                    object_class: str, confidence: float, bbox: List[float], crop_path: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO crops (crop_id, clip_id, stream_id, timestamp, object_class, confidence, bbox_json, crop_image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (crop_id, clip_id, stream_id, timestamp, object_class, confidence, json.dumps(bbox), crop_path))
            conn.commit()

    def get_all_crops(self, object_class: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if object_class:
                cursor.execute("SELECT * FROM crops WHERE object_class = ? ORDER BY timestamp DESC", (object_class,))
            else:
                cursor.execute("SELECT * FROM crops ORDER BY timestamp DESC")
            return [dict(row) for row in cursor.fetchall()]

    def log_query(self, query_text: str, results_count: int, latency_ms: float, selected_clip_id: Optional[str] = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO queries (query_text, results_count, latency_ms, selected_clip_id)
            VALUES (?, ?, ?, ?)
            """, (query_text, results_count, latency_ms, selected_clip_id))
            conn.commit()
