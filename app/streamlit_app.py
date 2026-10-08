"""
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
import time

# Ensure root directory is in sys.path
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

# Streamlit Page Config
st.set_page_config(
    page_title="Multi-Stream Video Intelligence Studio",
    page_icon="📹",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State & Managers
if "db" not in st.session_state:
    st.session_state.db = DatabaseManager(config.DB_PATH)
    st.session_state.ingestor = VideoIngestor(st.session_state.db)
    st.session_state.clipper = VideoClipper(st.session_state.db)
    st.session_state.embedder = MultiModalEmbedder()
    st.session_state.index_store = VectorIndexStore()
    st.session_state.retriever = TemporalRetrievalEngine(
        st.session_state.embedder,
        st.session_state.index_store,
        st.session_state.db
    )
    st.session_state.reranker = Reranker()
    st.session_state.reid_tracker = ReIDTracker(st.session_state.db, st.session_state.embedder)

db = st.session_state.db
ingestor = st.session_state.ingestor
clipper = st.session_state.clipper

# ----------------- SIDEBAR: NAVIGATION & STREAM INGESTION -----------------
with st.sidebar:
    st.title("📹 Video Intelligence")
    st.markdown("Multi-Camera Surveillance & Temporal Retrieval")
    
    nav_option = st.radio(
        "Navigation",
        ["Stream Manager & Upload", "Multi-Camera Live Grid", "Temporal NL Search", "Cross-Camera Re-ID", "Memory & Database", "Evaluation & Ablation"],
        index=0
    )
    
    st.divider()
    st.subheader("➕ Add Video Stream")

    upload_mode = st.radio("Stream Ingestion Method", ["Upload Video File", "Manual URL / RTSP", "Surveillance Preset"], index=0)

    if upload_mode == "Upload Video File":
        uploaded_file = st.file_uploader(
            "Choose a video file",
            type=["mp4", "webm", "mov", "avi", "mkv"],
            help="Upload video surveillance footage or recorded camera stream"
        )
        custom_name = st.text_input("Camera Label / Location", placeholder="e.g. North Gate Cam 01")
        
        if uploaded_file is not None:
            if st.button("Process & Ingest Uploaded Video", type="primary", use_container_width=True):
                with st.spinner("Ingesting and probing video file..."):
                    result = ingestor.ingest_uploaded_file(uploaded_file, custom_name=custom_name or None)
                    # Slice into temporal clips
                    clips = clipper.slice_stream_into_clips(
                        stream_id=result["stream_id"],
                        video_path=result["file_path"],
                        duration=result["meta"]["duration"]
                    )
                    # Index clips in vector store
                    for c in clips:
                        vec = st.session_state.embedder.embed_text(c["caption"])
                        st.session_state.index_store.add(vec, c)
                        
                    st.success(f"Successfully ingested {result['name']} ({result['meta']['duration']}s, {len(clips)} clips indexed)!")
                    st.rerun()

    elif upload_mode == "Manual URL / RTSP":
        stream_url = st.text_input("Stream URL or RTSP Link", placeholder="rtsp://192.168.1.100:554/live or https://...")
        manual_name = st.text_input("Stream Name", placeholder="e.g. Perimeter Cam 03")
        camera_zone = st.selectbox("Assigned Zone", ["Zone 1: Perimeter", "Zone 2: Lobby", "Zone 3: Parking", "Zone 4: Loading Dock"])
        
        if st.button("Register Manual Stream", type="primary", use_container_width=True):
            if stream_url and manual_name:
                with st.spinner("Registering camera stream..."):
                    res = ingestor.ingest_manual_stream(stream_url, manual_name, source_type="url")
                    st.success(f"Stream '{manual_name}' registered successfully!")
                    st.rerun()
            else:
                st.warning("Please provide both stream URL and camera name.")

    elif upload_mode == "Surveillance Preset":
        preset_choice = st.selectbox(
            "Select Preset Surveillance Feed",
            [
                "CAM_01: Building Main Entrance",
                "CAM_02: Parking Structure B2",
                "CAM_03: Warehouse Loading Dock",
                "CAM_04: Perimeter East Fence",
                "CAM_05: Main Lobby & Reception"
            ]
        )
        if st.button("Load Preset Camera", use_container_width=True):
            cam_code = preset_choice.split(":")[0]
            cam_label = preset_choice.split(":")[1].strip()
            ingestor.ingest_manual_stream(f"sim://{cam_code.lower()}", f"{cam_code}: {cam_label}", source_type="preset")
            st.success(f"Loaded {cam_code}!")
            st.rerun()

    st.divider()
    active_streams = db.get_all_streams()
    st.caption(f"Total Configured Streams: **{len(active_streams)}**")

# ----------------- MAIN PANEL LOGIC -----------------

if nav_option == "Stream Manager & Upload":
    st.header("🎛️ Stream Manager & Manual Ingestion")
    st.markdown("Manage surveillance feeds, upload new video recordings, probe metadata, and monitor indexing pipelines.")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Streams", len(active_streams))
    with col2:
        total_clips = sum(len(db.get_clips_for_stream(s["stream_id"])) for s in active_streams)
        st.metric("Indexed Clips", total_clips)
    with col3:
        all_crops = db.get_all_crops()
        st.metric("Detected Crops", len(all_crops))
    with col4:
        st.metric("Vector Index Size", st.session_state.index_store.count())

    st.subheader("Configured Video Feeds")
    if not active_streams:
        st.info("No streams configured yet. Use the sidebar to upload a video or register a manual stream.")
    else:
        for s in active_streams:
            with st.expander(f"📹 {s['name']} [{s['stream_id']}] - {s['source_type'].upper()}", expanded=True):
                c1, c2, c3 = st.columns([2, 1, 1])
                with c1:
                    st.write(f"**Resolution:** {s['resolution']} | **FPS:** {s['fps']} | **Duration:** {s['duration']}s")
                    st.write(f"**Path / Source:** `{s['file_path']}`")
                    st.write(f"**Status:** `{s['status']}`")
                with c2:
                    clips_count = len(db.get_clips_for_stream(s["stream_id"]))
                    st.write(f"**Temporal Clips:** {clips_count}")
                    if st.button(f"Re-Index Clips", key=f"reindex_{s['stream_id']}"):
                        st.info(f"Re-indexing clips for {s['name']}...")
                with c3:
                    if st.button("🗑️ Remove Stream", key=f"del_{s['stream_id']}", type="secondary"):
                        db.delete_stream(s["stream_id"])
                        st.success(f"Removed {s['name']}")
                        st.rerun()

elif nav_option == "Multi-Camera Live Grid":
    st.header("📺 Multi-Camera Surveillance Grid")
    st.markdown("Real-time temporal monitoring matrix across all active video streams.")

    if not active_streams:
        st.warning("No video feeds available. Add video streams via the sidebar.")
    else:
        cols = st.columns(2)
        for idx, s in enumerate(active_streams):
            col = cols[idx % 2]
            with col:
                st.subheader(f"Cam: {s['name']}")
                if os.path.exists(s["file_path"]):
                    st.video(s["file_path"])
                else:
                    st.info(f"Simulated live stream feed [{s['file_path']}] - Active monitoring")
                st.caption(f"ID: {s['stream_id']} | Resolution: {s['resolution']} | FPS: {s['fps']}")

elif nav_option == "Temporal NL Search":
    st.header("🔍 Natural Language Temporal Video Retrieval")
    st.markdown("Search across all ingested camera streams using natural language queries with temporal localization.")

    query = st.text_input("Natural Language Search Query", placeholder="e.g., person wearing red hoodie walking near gate")
    
    col_a, col_b, col_c = st.columns([2, 1, 1])
    with col_a:
        time_slider = st.slider("Time Window Filter (seconds)", 0, 300, (0, 300))
    with col_b:
        cam_filter_names = ["All Cameras"] + [s["name"] for s in active_streams]
        selected_cam_name = st.selectbox("Filter Camera", cam_filter_names)
    with col_c:
        enable_rerank = st.checkbox("Enable Temporal Re-ranking", value=True)

    if st.button("Execute Multi-Stream Search", type="primary"):
        if query:
            with st.spinner("Querying vector index & calculating similarity..."):
                target_stream_id = None
                if selected_cam_name != "All Cameras":
                    for s in active_streams:
                        if s["name"] == selected_cam_name:
                            target_stream_id = s["stream_id"]
                            break

                res = st.session_state.retriever.search(
                    query_text=query,
                    top_k=8,
                    filter_stream_id=target_stream_id,
                    time_range=time_slider
                )
                
                results = res["results"]
                if enable_rerank and results:
                    results = st.session_state.reranker.rerank(query, results)

                st.success(f"Retrieved {len(results)} matches in {res['latency_ms']} ms")

                if not results:
                    st.warning("No clips matched the specified criteria.")
                else:
                    cols = st.columns(3)
                    for i, r in enumerate(results):
                        c = cols[i % 3]
                        with c:
                            st.markdown(f"**Match #{i+1}** (Score: `{r['score']}`)")
                            st.write(f"**Camera:** {r['stream_id']}")
                            st.write(f"**Timestamp:** {r['start_time']}s - {r['end_time']}s")
                            st.write(f"_{r['caption']}_")
                            if r.get("keyframe_path") and os.path.exists(r["keyframe_path"]):
                                st.image(r["keyframe_path"], use_container_width=True)

elif nav_option == "Cross-Camera Re-ID":
    st.header("🎯 Cross-Camera Re-Identification (Re-ID)")
    st.markdown("Track individuals or vehicles across disjoint surveillance cameras over time.")

    crops = db.get_all_crops()
    if not crops:
        st.info("No detected object crops found yet. Ingest or upload videos to extract person/vehicle crops.")
    else:
        st.subheader("Select Query Entity Crop")
        crop_ids = [c["crop_id"] for c in crops]
        selected_crop_id = st.selectbox("Select Target Crop ID", crop_ids)
        
        target_crop = next((c for c in crops if c["crop_id"] == selected_crop_id), None)
        if target_crop:
            col1, col2 = st.columns([1, 3])
            with col1:
                st.write(f"**Class:** {target_crop['object_class']}")
                st.write(f"**Origin Camera:** {target_crop['stream_id']}")
                st.write(f"**Timestamp:** {target_crop['timestamp']}s")
            with col2:
                if st.button("Run Multi-Camera Re-ID Tracker", type="primary"):
                    matches = st.session_state.reid_tracker.find_matches_across_streams(
                        query_crop_id=target_crop["crop_id"],
                        query_stream_id=target_crop["stream_id"],
                        query_timestamp=target_crop["timestamp"],
                        candidate_crops=crops
                    )
                    st.subheader(f"Found {len(matches)} Cross-Camera Sightings")
                    for m in matches:
                        st.info(f"Camera **{m['stream_id']}** at **{m['timestamp']}s** | Re-ID Confidence: **{m['reid_confidence'] * 100:.1f}%** (Δt: {m['time_diff_sec']}s)")

elif nav_option == "Memory & Database":
    st.header("💾 Spatial-Temporal Memory & SQLite Store")
    st.markdown("Inspect SQLite `data/store.db` tables and historical search query audit logs.")
    
    tab1, tab2, tab3 = st.tabs(["Active Streams", "Detected Crops", "Query Audit Log"])
    with tab1:
        st.dataframe(active_streams, use_container_width=True)
    with tab2:
        st.dataframe(db.get_all_crops(), use_container_width=True)
    with tab3:
        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM queries ORDER BY executed_at DESC LIMIT 50")
            queries_data = [dict(r) for r in cursor.fetchall()]
        st.dataframe(queries_data, use_container_width=True)

elif nav_option == "Evaluation & Ablation":
    st.header("📊 Benchmark Evaluation & Ablation Study")
    st.markdown("Quantitative evaluation of retrieval precision, recall, latency, and pipeline component ablations.")

    from eval.ablation import ABLATION_RESULTS
    st.subheader("System Ablation Study")
    st.dataframe(ABLATION_RESULTS, use_container_width=True)
    
    st.subheader("Benchmark Ground Truth Queries")
    with open(ROOT_DIR / "eval" / "queries.json", "r") as f:
        bench_queries = json.load(f)
    st.json(bench_queries)
