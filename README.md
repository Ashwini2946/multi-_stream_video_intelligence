# Multi-Stream Video Intelligence

A modular, high-performance spatial-temporal multi-camera surveillance intelligence platform featuring:
- **Manual Video Addition & File Uploads**: Enable operators to upload video files (`.mp4`, `.webm`, `.avi`, `.mov`) or register manual stream feeds (RTSP/URL).
- **Temporal Video Slicing & Keyframe Extraction**: Segment videos into overlapping temporal windows with keyframe motion scoring.
- **Multi-Modal Dense Embeddings**: Vector representation of video keyframes and natural language text queries using vision-language embeddings.
- **Fast Vector Indexing**: Sub-millisecond similarity search over camera streams.
- **Temporal & Semantic Re-ranking**: Boost contiguous temporal detections and lexical keywords.
- **Cross-Camera Re-Identification (Re-ID)**: Track individuals and vehicles across disjoint camera zones with spatial-temporal constraints.
- **Evaluation & Ablation Suite**: Precision@K, Recall@K, MRR, and modular ablation comparisons.

---

## Directory Structure

```
multi-stream-video-intelligence/
├── README.md
├── requirements.txt
├── config.py
├── data/
│   ├── videos/              # Ingested and uploaded video files
│   ├── clips/               # Temporal sub-clips and keyframe snapshots
│   ├── crops/               # Detected person and vehicle bounding box crops
│   ├── index/               # Vector indexes
│   └── store.db             # SQLite database for streams, clips, crops, events
├── src/
│   ├── db.py                # SQLite schema and query manager
│   ├── ingest.py            # Video probing, file uploads, and stream registration
│   ├── embedder.py          # Vision-language embedding generator
│   ├── index_store.py       # Vector index store and similarity search
│   ├── parser.py            # Keyframe extraction & object detection
│   ├── memory.py            # Spatio-temporal event memory graph
│   ├── retrieval.py         # Natural language temporal video retrieval
│   ├── rerank.py            # Semantic and temporal re-ranker
│   ├── clipper.py           # Temporal video slicer & crop extractor
│   ├── baseline.py          # BM25 & raw vector baselines
│   └── reid.py              # Cross-camera Re-ID tracker
├── app/
│   └── streamlit_app.py     # Interactive Streamlit application interface
├── eval/
│   ├── queries.json         # Ground truth benchmark queries
│   ├── run_eval.py          # Evaluation metrics calculation (MRR, Recall@K)
│   └── ablation.py          # System ablation study suite
└── docs/
    └── writeup.md           # Architecture and technical design writeup
```

---

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Streamlit Application
```bash
streamlit run app/streamlit_app.py
```

### 3. Add Videos Manually & Upload Files
1. Open the sidebar in the Streamlit interface.
2. Select **"Upload Video File"** under *Stream Ingestion Method*.
3. Choose a local video file (`.mp4`, `.webm`, `.mov`, `.avi`) or drag-and-drop into the file uploader.
4. Provide an optional camera label (e.g., `North Gate Cam 01`) and click **"Process & Ingest Uploaded Video"**.
5. Alternatively, choose **"Manual URL / RTSP"** to connect an IP camera stream, or **"Surveillance Preset"** to load pre-configured surveillance camera feeds.
