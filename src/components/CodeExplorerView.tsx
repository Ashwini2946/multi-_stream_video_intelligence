import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Folder } from 'lucide-react';

const FILES_MAP: Record<string, { lang: string; description: string; content: string }> = {
  'app/streamlit_app.py': {
    lang: 'python',
    description: 'Streamlit user interface enabling manual video addition, file uploads, search, and Re-ID',
    content: `"""
Multi-Stream Video Intelligence - Streamlit Application.
Provides interactive UI for manual video addition, file uploads,
multi-stream monitoring, temporal retrieval, cross-camera Re-ID,
and benchmark ablation inspection.
"""
import streamlit as st
import os
import sys
from pathlib import Path
import json

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

import config
from src.db import DatabaseManager
from src.ingest import VideoIngestor
from src.clipper import VideoClipper
from src.embedder import MultiModalEmbedder
from src.index_store import VectorIndexStore
from src.retrieval import TemporalRetrievalEngine
from src.rerank import Reranker
from src.reid import ReIDTracker

st.set_page_config(page_title="Multi-Stream Video Intelligence Studio", layout="wide")

# Sidebar Upload & Manual Ingestion
with st.sidebar:
    st.title("📹 Video Intelligence")
    upload_mode = st.radio("Stream Ingestion Method", ["Upload Video File", "Manual URL / RTSP", "Surveillance Preset"])

    if upload_mode == "Upload Video File":
        uploaded_file = st.file_uploader("Choose a video file", type=["mp4", "webm", "mov", "avi", "mkv"])
        custom_name = st.text_input("Camera Label / Location", placeholder="e.g. North Gate Cam 01")
        if uploaded_file and st.button("Process & Ingest Uploaded Video", type="primary"):
            result = ingestor.ingest_uploaded_file(uploaded_file, custom_name=custom_name)
            clips = clipper.slice_stream_into_clips(result["stream_id"], result["file_path"], result["meta"]["duration"])
            st.success(f"Ingested {result['name']} ({len(clips)} clips indexed)!")
            st.rerun()
`,
  },
  'src/ingest.py': {
    lang: 'python',
    description: 'Handles manual video additions, probing video duration, FPS, and resolution',
    content: `"""
Video Ingestion module for Multi-Stream Video Intelligence.
Handles manual video addition by users, file uploads via Streamlit / API,
format conversion, frame probing, and persistent registration in SQLite.
"""
import os
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import cv2
import config

class VideoIngestor:
    def __init__(self, db_manager):
        self.db = db_manager
        self.videos_dir = config.VIDEOS_DIR

    def probe_video_file(self, file_path: Path) -> Dict[str, Any]:
        cap = cv2.VideoCapture(str(file_path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = frame_count / fps if fps > 0 else 0.0
        cap.release()
        return {"fps": round(fps, 2), "duration": round(duration, 2), "resolution": f"{width}x{height}"}

    def ingest_uploaded_file(self, uploaded_file, custom_name: Optional[str] = None):
        stream_id = f"cam_{uuid.uuid4().hex[:8]}"
        name = custom_name or getattr(uploaded_file, "name", "uploaded_cam")
        target_path = self.videos_dir / f"{stream_id}.mp4"
        with open(target_path, "wb") as f:
            f.write(uploaded_file.getbuffer() if hasattr(uploaded_file, "getbuffer") else uploaded_file.read())
        meta = self.probe_video_file(target_path)
        self.db.insert_stream(stream_id, name, "upload", str(target_path), meta["fps"], meta["duration"], meta["resolution"])
        return {"stream_id": stream_id, "name": name, "file_path": str(target_path), "meta": meta}
`,
  },
  'src/reid.py': {
    lang: 'python',
    description: 'Cross-camera Person and Vehicle Re-Identification using visual similarity & camera topology',
    content: `"""
Cross-Camera Person & Vehicle Re-Identification (Re-ID).
Tracks entities across disjoint camera fields of view by matching visual appearance
features, spatial-temporal constraints, and camera network topology.
"""
import numpy as np
import config

class ReIDTracker:
    def __init__(self, db_manager, embedder):
        self.db = db_manager
        self.embedder = embedder
        self.topology = config.CAMERA_TOPOLOGY

    def find_matches_across_streams(self, query_crop_id: str, query_stream_id: str, query_timestamp: float, candidate_crops: list):
        matches = []
        query_sig = self.embedder.embed_text(f"query_crop_{query_crop_id}")

        for crop in candidate_crops:
            if crop["crop_id"] == query_crop_id:
                continue
            time_diff = abs(crop["timestamp"] - query_timestamp)
            if time_diff > config.REID_MAX_TIME_GAP_SEC:
                continue

            cand_sig = self.embedder.embed_text(f"crop_{crop['crop_id']}")
            visual_sim = self.embedder.compute_similarity(query_sig, cand_sig)
            topo_bonus = 0.08 if crop["stream_id"] in self.topology.get(query_stream_id, []) else 0.0
            final_score = visual_sim * 0.85 + topo_bonus

            if final_score >= 0.50:
                matches.append({
                    "crop_id": crop["crop_id"],
                    "stream_id": crop["stream_id"],
                    "timestamp": crop["timestamp"],
                    "time_diff_sec": round(time_diff, 1),
                    "reid_confidence": round(float(final_score), 3)
                })

        matches.sort(key=lambda x: x["reid_confidence"], reverse=True)
        return matches
`,
  },
  'config.py': {
    lang: 'python',
    description: 'Global system configuration, directories, frame rates, and camera topology',
    content: `from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
VIDEOS_DIR = DATA_DIR / "videos"
CLIPS_DIR = DATA_DIR / "clips"
CROPS_DIR = DATA_DIR / "crops"
INDEX_DIR = DATA_DIR / "index"
DB_PATH = DATA_DIR / "store.db"

SAMPLE_FPS = 2
CLIP_DURATION_SEC = 5
CLIP_OVERLAP_SEC = 1
EMBEDDING_DIM = 512
REID_SIMILARITY_THRESHOLD = 0.70
CAMERA_TOPOLOGY = {
    "CAM_01": ["CAM_02", "CAM_03"],
    "CAM_02": ["CAM_01", "CAM_04"],
    "CAM_03": ["CAM_01", "CAM_04", "CAM_05"],
    "CAM_04": ["CAM_02", "CAM_03", "CAM_05"],
    "CAM_05": ["CAM_03", "CAM_04"]
}
`,
  },
};

export const CodeExplorerView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('app/streamlit_app.py');
  const [copied, setCopied] = useState(false);

  const current = FILES_MAP[selectedFile] || FILES_MAP['app/streamlit_app.py'];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0e1117] text-[#fafafa] overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-[#262730] px-6 flex items-center justify-between bg-[#1b1c24]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#ff4b4b]" />
          <h2 className="text-sm font-bold text-white">Repository Source Code & Architecture</h2>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs bg-[#262730] hover:bg-[#31333f] text-[#d4d6de] px-3 py-1.5 rounded flex items-center gap-1.5 transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Code'}</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File tree sidebar */}
        <div className="w-64 border-r border-[#262730] bg-[#14151b] p-3 overflow-y-auto space-y-1">
          <p className="text-[10px] font-mono text-[#808495] uppercase tracking-wider mb-2">Files</p>
          {Object.keys(FILES_MAP).map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFile(f)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition flex items-center gap-2 ${
                selectedFile === f
                  ? 'bg-[#ff4b4b]/15 text-[#ff4b4b] font-bold border border-[#ff4b4b]/30'
                  : 'text-[#a3a8b8] hover:bg-[#1f212a] hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{f}</span>
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c10]">
          <div className="p-3 border-b border-[#1b1c24] bg-[#12141c] flex items-center justify-between text-xs">
            <span className="font-mono text-[#ff4b4b] font-bold">{selectedFile}</span>
            <span className="text-[#808495] text-[11px]">{current.description}</span>
          </div>
          <pre className="flex-1 p-4 font-mono text-xs overflow-auto text-[#cbd5e1] leading-relaxed select-text">
            <code>{current.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
