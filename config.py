"""
Configuration file for Multi-Stream Video Intelligence System.
Defines storage paths, model specifications, vector index settings,
video ingestion parameters, and cross-camera Re-ID thresholds.
"""
from pathlib import Path
import os

# Base directory
BASE_DIR = Path(__file__).resolve().parent

# Data storage paths
DATA_DIR = BASE_DIR / "data"
VIDEOS_DIR = DATA_DIR / "videos"
CLIPS_DIR = DATA_DIR / "clips"
CROPS_DIR = DATA_DIR / "crops"
INDEX_DIR = DATA_DIR / "index"
DB_PATH = DATA_DIR / "store.db"

# Ensure directories exist
for directory in [DATA_DIR, VIDEOS_DIR, CLIPS_DIR, CROPS_DIR, INDEX_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Video Processing Configurations
ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
SAMPLE_FPS = 2                  # Extract 2 frames per second for indexing
CLIP_DURATION_SEC = 5           # Temporal clip window in seconds
CLIP_OVERLAP_SEC = 1            # Overlap between consecutive clips
KEYFRAME_MIN_MOTION = 0.15      # Motion threshold for keyframe extraction
MAX_VIDEO_DURATION_SEC = 3600   # Max video ingestion length (1 hour)
RESIZE_RESOLUTION = (640, 360)  # Processing resolution for consistency

# Object Detection & Crop Configurations
OBJECT_CLASSES = ["person", "car", "truck", "bus", "motorcycle", "bicycle", "backpack", "suitcase"]
DETECTION_CONFIDENCE_THRESHOLD = 0.45
MIN_CROP_AREA = 1000            # Ignore tiny noisy detections
EXPAND_CROP_BOX_RATIO = 0.05    # Context margin around detected bbox

# Embedding and Vector Index Settings
EMBEDDING_MODEL = "clip-ViT-B-32"   # Multi-modal vision-language embedding model
EMBEDDING_DIM = 512                 # Dimension for CLIP embeddings
INDEX_TYPE = "IndexFlatIP"          # FAISS Inner Product (Cosine similarity when normalized)
FAISS_INDEX_PATH = INDEX_DIR / "video_clips.index"
CROPS_INDEX_PATH = INDEX_DIR / "object_crops.index"

# Retrieval & Re-ranking Settings
DEFAULT_TOP_K = 10
RERANK_ALPHA = 0.65                 # Weight for dense visual score vs temporal/re-id score
TEMPORAL_WINDOW_BOOST = 1.2         # Score boost for contiguous temporal matches
SIMILARITY_THRESHOLD = 0.22         # Base cutoff for semantic match

# Cross-Camera Re-ID (Re-Identification) Settings
REID_SIMILARITY_THRESHOLD = 0.70    # High confidence threshold for same identity
REID_MAX_TIME_GAP_SEC = 600         # Max allowed transit time between camera zones (10 mins)
CAMERA_TOPOLOGY = {
    "CAM_01": ["CAM_02", "CAM_03"], # Adjacency mapping between surveillance zones
    "CAM_02": ["CAM_01", "CAM_04"],
    "CAM_03": ["CAM_01", "CAM_04", "CAM_05"],
    "CAM_04": ["CAM_02", "CAM_03", "CAM_05"],
    "CAM_05": ["CAM_03", "CAM_04"],
}

# Gemini API Integration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3.8-flash"
