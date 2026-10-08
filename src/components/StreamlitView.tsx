import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  Search,
  Users,
  Database,
  BarChart3,
  FileCode,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Clock,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Maximize2,
  Sliders,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowRight,
  Compass
} from 'lucide-react';
import { StreamItem, ClipItem, CropItem, QueryLog, ReIDMatch, AblationItem } from '../types';
import { renderSurveillanceFrame } from '../utils/canvasVideoSimulator';

interface StreamlitViewProps {
  streams: StreamItem[];
  clips: ClipItem[];
  crops: CropItem[];
  onUploadVideo: (file: File, customName: string, zone: string) => Promise<void>;
  onAddManualStream: (name: string, streamUrl: string, zone: string) => Promise<void>;
  onDeleteStream: (streamId: string) => Promise<void>;
  onSearch: (query: string, streamId: string, timeRange: [number, number], enableRerank: boolean) => Promise<ClipItem[]>;
  onRunReID: (cropId: string) => Promise<{ targetCrop: CropItem; matches: ReIDMatch[] }>;
  onGeminiAnalysis?: (prompt: string, context: any) => Promise<string>;
  ablationData: AblationItem[];
  queryLogs: QueryLog[];
  loadingState: boolean;
  statusMessage: string;
}

export const StreamlitView: React.FC<StreamlitViewProps> = ({
  streams,
  clips,
  crops,
  onUploadVideo,
  onAddManualStream,
  onDeleteStream,
  onSearch,
  onRunReID,
  onGeminiAnalysis,
  ablationData,
  queryLogs,
  loadingState,
  statusMessage
}) => {
  // Navigation State
  const [activeNav, setActiveNav] = useState<string>('Stream Manager & Upload');

  // Sidebar Upload State
  const [ingestionMethod, setIngestionMethod] = useState<'upload' | 'url' | 'preset'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customCameraName, setCustomCameraName] = useState('');
  const [cameraZone, setCameraZone] = useState('Zone 1: Perimeter');
  const [manualUrl, setManualUrl] = useState('');
  const [presetChoice, setPresetChoice] = useState('CAM_01: Building Main Entrance');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCamFilter, setSelectedCamFilter] = useState('ALL');
  const [timeMin, setTimeMin] = useState(0);
  const [timeMax, setTimeMax] = useState(300);
  const [enableRerank, setEnableRerank] = useState(true);
  const [searchResults, setSearchResults] = useState<ClipItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchLatency, setSearchLatency] = useState<number | null>(null);

  // Re-ID State
  const [selectedCropId, setSelectedCropId] = useState<string>(crops[0]?.crop_id || '');
  const [reidResults, setReidResults] = useState<{ targetCrop?: CropItem; matches: ReIDMatch[] } | null>(null);
  const [reidLoading, setReidLoading] = useState(false);

  // Gemini AI State
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  // Stream Preview Animation time
  const [animTime, setAnimTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Timer loop for canvas surveillance feeds
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimTime((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle Video Upload submission
  const handleSubmitUpload = async () => {
    if (!selectedFile) return;
    setUploadProgress(20);
    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 20 : p));
      }, 150);

      await onUploadVideo(selectedFile, customCameraName, cameraZone);
      clearInterval(interval);
      setUploadProgress(100);
      setSelectedFile(null);
      setCustomCameraName('');
      setTimeout(() => setUploadProgress(0), 1200);
    } catch (err) {
      setUploadProgress(0);
    }
  };

  // Handle Manual URL submission
  const handleSubmitManualUrl = async () => {
    if (!manualUrl) return;
    await onAddManualStream(customCameraName || 'Network Stream', manualUrl, cameraZone);
    setManualUrl('');
    setCustomCameraName('');
  };

  // Handle Preset Load
  const handleLoadPreset = async () => {
    const [camCode, camLabel] = presetChoice.split(':');
    await onAddManualStream(`${camCode.trim()}: ${camLabel.trim()}`, `preset://${camCode.toLowerCase().trim()}`, 'Preset Zone');
  };

  // Handle Execute Search
  const handleExecuteSearch = async () => {
    if (!searchQuery.trim()) return;
    const t0 = performance.now();
    const results = await onSearch(searchQuery, selectedCamFilter, [timeMin, timeMax], enableRerank);
    const dur = performance.now() - t0;
    setSearchResults(results);
    setSearchLatency(Math.round(dur));
    setHasSearched(true);
  };

  // Handle Execute Re-ID
  const handleExecuteReID = async (cropIdToUse?: string) => {
    const targetId = cropIdToUse || selectedCropId;
    if (!targetId) return;
    setReidLoading(true);
    try {
      const res = await onRunReID(targetId);
      setReidResults(res);
    } finally {
      setReidLoading(false);
    }
  };

  // Handle Gemini AI Analysis
  const handleRunGemini = async () => {
    if (!onGeminiAnalysis) return;
    setGeminiLoading(true);
    try {
      const context = {
        activeStreams: streams.map((s) => ({ id: s.stream_id, name: s.name, type: s.source_type })),
        recentClips: clips.slice(0, 5),
        detectedCrops: crops.slice(0, 4),
        lastSearch: searchQuery || 'General multi-camera audit',
      };
      const text = await onGeminiAnalysis(
        `Provide an executive surveillance situation brief for the multi-stream intelligence setup. Identify any suspicious entity transitions between CAM_01 and CAM_04.`,
        context
      );
      setGeminiReport(text);
    } finally {
      setGeminiLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0e1117] text-[#fafafa] font-sans overflow-hidden">
      {/* ------------------- STREAMLIT SIDEBAR ------------------- */}
      <aside className="w-80 flex-shrink-0 bg-[#262730] border-r border-[#31333f] flex flex-col h-full overflow-y-auto">
        {/* Streamlit Brand Header */}
        <div className="p-4 border-b border-[#31333f]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📹</span>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Video Intelligence</h1>
              <p className="text-xs text-[#a3a8b8]">Streamlit Surveillance Studio</p>
            </div>
          </div>
        </div>

        {/* Streamlit Navigation Radio */}
        <div className="p-4 border-b border-[#31333f]">
          <label className="text-xs font-semibold text-[#808495] uppercase tracking-wider block mb-2">
            Navigation
          </label>
          <div className="space-y-1">
            {[
              { id: 'Stream Manager & Upload', icon: Video, label: 'Stream Manager & Upload' },
              { id: 'Multi-Camera Live Grid', icon: Layers, label: 'Multi-Camera Live Grid' },
              { id: 'Temporal NL Search', icon: Search, label: 'Temporal NL Search' },
              { id: 'Cross-Camera Re-ID', icon: Users, label: 'Cross-Camera Re-ID' },
              { id: 'Memory & Database', icon: Database, label: 'Memory & Database' },
              { id: 'Evaluation & Ablation', icon: BarChart3, label: 'Evaluation & Ablation' },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-all text-left ${
                    isActive
                      ? 'bg-[#ff4b4b] text-white font-semibold shadow-sm'
                      : 'text-[#d4d6de] hover:bg-[#31333f]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------------- SIDEBAR: ADD VIDEO STREAM (User manual add & upload) ---------------- */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>➕ Add Video Stream</span>
            </h2>
            <span className="text-[10px] bg-[#31333f] text-[#ff4b4b] px-1.5 py-0.5 rounded font-mono font-bold">
              MANUAL
            </span>
          </div>
          <p className="text-[11px] text-[#a3a8b8] mb-3">
            Add cameras manually or upload video files directly into the intelligence pipeline.
          </p>

          {/* Ingestion Method Tabs (Streamlit Radio Widget) */}
          <div className="bg-[#1b1c24] p-1 rounded-md mb-3 flex text-[11px]">
            <button
              onClick={() => setIngestionMethod('upload')}
              className={`flex-1 py-1 rounded font-medium transition ${
                ingestionMethod === 'upload' ? 'bg-[#ff4b4b] text-white' : 'text-[#808495] hover:text-white'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setIngestionMethod('url')}
              className={`flex-1 py-1 rounded font-medium transition ${
                ingestionMethod === 'url' ? 'bg-[#ff4b4b] text-white' : 'text-[#808495] hover:text-white'
              }`}
            >
              URL / RTSP
            </button>
            <button
              onClick={() => setIngestionMethod('preset')}
              className={`flex-1 py-1 rounded font-medium transition ${
                ingestionMethod === 'preset' ? 'bg-[#ff4b4b] text-white' : 'text-[#808495] hover:text-white'
              }`}
            >
              Presets
            </button>
          </div>

          {/* METHOD 1: UPLOAD VIDEO FILE (Streamlit st.file_uploader) */}
          {ingestionMethod === 'upload' && (
            <div className="space-y-3">
              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-3 text-center transition cursor-pointer ${
                  isDragging
                    ? 'border-[#ff4b4b] bg-[#ff4b4b]/10'
                    : selectedFile
                    ? 'border-green-500/60 bg-green-950/20'
                    : 'border-[#464855] hover:border-[#ff4b4b] bg-[#1a1c23]'
                }`}
              >
                <input
                  type="file"
                  id="st-video-upload"
                  accept="video/mp4,video/webm,video/mov,video/avi,video/mkv,.mp4,.webm,.mov,.avi,.mkv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="st-video-upload" className="cursor-pointer block">
                  <Upload
                    className={`w-6 h-6 mx-auto mb-1.5 ${
                      selectedFile ? 'text-green-400' : 'text-[#808495]'
                    }`}
                  />
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-semibold text-green-300 truncate max-w-[200px] mx-auto">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-[#a3a8b8] mt-0.5">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to ingest
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-white">Drag and drop file here</p>
                      <p className="text-[10px] text-[#808495] mt-0.5">
                        Limit 200MB per file • MP4, WEBM, MOV, AVI
                      </p>
                      <span className="mt-2 inline-block text-[10px] bg-[#31333f] text-[#ff4b4b] px-2 py-0.5 rounded font-semibold">
                        Browse files
                      </span>
                    </div>
                  )}
                </label>
              </div>

              {/* Camera Label / Zone */}
              <div>
                <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                  Camera Label / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Gate Cam 01"
                  value={customCameraName}
                  onChange={(e) => setCustomCameraName(e.target.value)}
                  className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                  Assigned Security Zone
                </label>
                <select
                  value={cameraZone}
                  onChange={(e) => setCameraZone(e.target.value)}
                  className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff4b4b]"
                >
                  <option value="Zone 1: Perimeter">Zone 1: Perimeter</option>
                  <option value="Zone 2: Main Lobby">Zone 2: Main Lobby</option>
                  <option value="Zone 3: Parking Garage">Zone 3: Parking Garage</option>
                  <option value="Zone 4: Loading Dock">Zone 4: Loading Dock</option>
                </select>
              </div>

              {/* Progress bar */}
              {uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-[#a3a8b8]">
                    <span>Ingesting & Slicing Clips...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#31333f] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff4b4b] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                disabled={!selectedFile || loadingState}
                onClick={handleSubmitUpload}
                className="w-full bg-[#ff4b4b] hover:bg-[#ff3333] disabled:opacity-50 text-white font-semibold text-xs py-2 rounded transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                Process & Ingest Uploaded Video
              </button>
            </div>
          )}

          {/* METHOD 2: MANUAL URL / RTSP STREAM */}
          {ingestionMethod === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                  Stream URL or RTSP Link
                </label>
                <input
                  type="text"
                  placeholder="rtsp://192.168.1.100:554/live or https://..."
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                  Camera Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. East Perimeter Camera"
                  value={customCameraName}
                  onChange={(e) => setCustomCameraName(e.target.value)}
                  className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                  Assigned Security Zone
                </label>
                <select
                  value={cameraZone}
                  onChange={(e) => setCameraZone(e.target.value)}
                  className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff4b4b]"
                >
                  <option value="Zone 1: Perimeter">Zone 1: Perimeter</option>
                  <option value="Zone 2: Main Lobby">Zone 2: Main Lobby</option>
                  <option value="Zone 3: Parking Garage">Zone 3: Parking Garage</option>
                  <option value="Zone 4: Loading Dock">Zone 4: Loading Dock</option>
                </select>
              </div>

              <button
                disabled={!manualUrl || loadingState}
                onClick={handleSubmitManualUrl}
                className="w-full bg-[#ff4b4b] hover:bg-[#ff3333] disabled:opacity-50 text-white font-semibold text-xs py-2 rounded transition flex items-center justify-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                Register Manual Stream
              </button>
            </div>
          )}

          {/* METHOD 3: SURVEILLANCE PRESETS */}
          {ingestionMethod === 'preset' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                  Surveillance Preset Feed
                </label>
                <select
                  value={presetChoice}
                  onChange={(e) => setPresetChoice(e.target.value)}
                  className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff4b4b]"
                >
                  <option value="CAM_01: Building Main Entrance">CAM_01: Building Main Entrance</option>
                  <option value="CAM_02: Parking Structure B2">CAM_02: Parking Structure B2</option>
                  <option value="CAM_03: Warehouse Loading Dock">CAM_03: Warehouse Loading Dock</option>
                  <option value="CAM_04: Perimeter East Fence">CAM_04: Perimeter East Fence</option>
                  <option value="CAM_05: Main Lobby & Reception">CAM_05: Main Lobby & Reception</option>
                </select>
              </div>

              <button
                onClick={handleLoadPreset}
                disabled={loadingState}
                className="w-full bg-[#31333f] hover:bg-[#3c3f4e] text-white font-medium text-xs py-2 rounded transition flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#ff4b4b]" />
                Load Preset Camera
              </button>
            </div>
          )}

          {/* Quick Stats in Sidebar */}
          <div className="mt-6 pt-4 border-t border-[#31333f] text-xs text-[#808495] space-y-1">
            <div className="flex justify-between">
              <span>Active Streams:</span>
              <span className="font-semibold text-white">{streams.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Indexed Clips:</span>
              <span className="font-semibold text-white">{clips.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Detected Crops:</span>
              <span className="font-semibold text-white">{crops.length}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ------------------- MAIN STREAMLIT PANEL ------------------- */}
      <main className="flex-1 flex flex-col h-full bg-[#0e1117] overflow-y-auto">
        {/* Streamlit Topbar */}
        <header className="h-12 border-b border-[#262730] px-6 flex items-center justify-between bg-[#0e1117]/90 backdrop-blur z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Multi-Stream Video Intelligence</span>
              <span className="text-[10px] bg-[#262730] text-[#a3a8b8] px-2 py-0.5 rounded font-mono border border-[#31333f]">
                STREAMLIT STUDIO
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Running Indicator (Authentic Streamlit aesthetic) */}
            {loadingState ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ff4b4b]/10 border border-[#ff4b4b]/40 rounded-full text-[11px] text-[#ff4b4b] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#ff4b4b]" />
                <span className="font-semibold">Running...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-[#808495]">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Ready</span>
              </div>
            )}

            {/* Quick Play/Pause for Video feeds */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-xs bg-[#262730] hover:bg-[#31333f] text-[#d4d6de] px-2.5 py-1 rounded flex items-center gap-1 transition"
              title="Toggle Live Video Simulation Playback"
            >
              {isPlaying ? <Pause className="w-3 h-3 text-[#ff4b4b]" /> : <Play className="w-3 h-3 text-green-400" />}
              <span>{isPlaying ? 'Live' : 'Paused'}</span>
            </button>
          </div>
        </header>

        {/* Status notification toast */}
        {statusMessage && (
          <div className="mx-6 mt-3 px-3 py-2 bg-[#1c2438] border border-[#2b3a58] rounded text-xs text-[#93c5fd] flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Body based on activeNav */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">

          {/* ================= SECTION 1: STREAM MANAGER & UPLOAD ================= */}
          {activeNav === 'Stream Manager & Upload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>🎛️ Stream Manager & Manual Ingestion</span>
                </h2>
                <p className="text-xs text-[#a3a8b8] mt-1">
                  Manage surveillance feeds, upload new video recordings, probe metadata, and monitor indexing pipelines.
                </p>
              </div>

              {/* Streamlit Metric Cards (st.metric) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4">
                  <p className="text-xs text-[#808495] font-medium">Total Streams</p>
                  <p className="text-2xl font-bold text-white mt-1">{streams.length}</p>
                  <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                    <span>Active Ingest Feeds</span>
                  </p>
                </div>

                <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4">
                  <p className="text-xs text-[#808495] font-medium">Indexed Clips</p>
                  <p className="text-2xl font-bold text-white mt-1">{clips.length}</p>
                  <p className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
                    <span>5s Window Slices</span>
                  </p>
                </div>

                <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4">
                  <p className="text-xs text-[#808495] font-medium">Detected Crops</p>
                  <p className="text-2xl font-bold text-white mt-1">{crops.length}</p>
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <span>Persons & Vehicles</span>
                  </p>
                </div>

                <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4">
                  <p className="text-xs text-[#808495] font-medium">Vector Index Size</p>
                  <p className="text-2xl font-bold text-white mt-1">{clips.length * 512} dims</p>
                  <p className="text-[10px] text-purple-400 mt-1 flex items-center gap-1">
                    <span>Cosine Similarity Matrix</span>
                  </p>
                </div>
              </div>

              {/* Upload Callout Action Banner */}
              <div className="bg-[#1a1c24] border border-[#ff4b4b]/30 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#ff4b4b]" />
                    <span>Upload Recorded Video Files to Pipeline</span>
                  </h3>
                  <p className="text-xs text-[#a3a8b8] mt-0.5">
                    Select local surveillance MP4, WebM, MOV files. The system slices 5s overlapping clips and generates searchable vector embeddings.
                  </p>
                </div>
                <label
                  htmlFor="st-video-upload-main"
                  className="bg-[#ff4b4b] hover:bg-[#ff3333] text-white text-xs font-semibold px-4 py-2 rounded cursor-pointer transition flex items-center gap-2 shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Video File</span>
                </label>
                <input
                  type="file"
                  id="st-video-upload-main"
                  accept="video/mp4,video/webm,video/mov,video/avi,video/mkv,.mp4,.webm,.mov,.avi,.mkv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setIngestionMethod('upload');
                    }
                  }}
                />
              </div>

              {/* Streamlit Expanders for Streams */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Configured Video Feeds ({streams.length})
                </h3>

                {streams.length === 0 ? (
                  <div className="bg-[#262730] border border-[#31333f] rounded-lg p-8 text-center text-[#808495]">
                    <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-white">No surveillance streams registered</p>
                    <p className="text-xs mt-1">Use the sidebar or the banner above to upload a video file or load presets.</p>
                  </div>
                ) : (
                  streams.map((s) => {
                    const streamClips = clips.filter((c) => c.stream_id === s.stream_id);
                    const streamCrops = crops.filter((c) => c.stream_id === s.stream_id);
                    return (
                      <div
                        key={s.stream_id}
                        className="bg-[#262730] border border-[#31333f] rounded-lg overflow-hidden transition"
                      >
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded bg-[#1e2029] border border-[#3c3f4e] flex items-center justify-center text-lg flex-shrink-0">
                              📹
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{s.name}</h4>
                                <span className="text-[10px] bg-[#31333f] text-[#ff4b4b] px-1.5 py-0.5 rounded font-mono font-bold">
                                  {s.stream_id}
                                </span>
                                <span className="text-[10px] bg-green-950/60 text-green-400 border border-green-800/40 px-1.5 py-0.5 rounded">
                                  {s.source_type.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-[#a3a8b8] mt-1 font-mono">
                                Res: {s.resolution} • FPS: {s.fps} • Duration: {s.duration}s • Slices: {streamClips.length} clips
                              </p>
                              <p className="text-[11px] text-[#808495] mt-0.5 truncate max-w-xl">
                                Source: <span className="text-[#a3a8b8]">{s.file_path}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveNav('Multi-Camera Live Grid');
                              }}
                              className="text-xs bg-[#31333f] hover:bg-[#3c3f4e] text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition"
                            >
                              <Play className="w-3 h-3 text-green-400" />
                              <span>View Feed</span>
                            </button>

                            <button
                              onClick={() => onDeleteStream(s.stream_id)}
                              className="text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 px-3 py-1.5 rounded flex items-center gap-1.5 transition"
                              title="Delete Stream"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        {/* Stream sub-clips preview tags */}
                        {streamClips.length > 0 && (
                          <div className="bg-[#1e2029] px-4 py-2 border-t border-[#31333f] flex items-center gap-2 overflow-x-auto text-[11px]">
                            <span className="text-[#808495] font-semibold flex-shrink-0">Clips:</span>
                            {streamClips.slice(0, 4).map((c) => (
                              <span
                                key={c.clip_id}
                                className="bg-[#262730] border border-[#31333f] px-2 py-0.5 rounded text-[#d4d6de] truncate max-w-xs"
                              >
                                {c.start_time}s-{c.end_time}s: {c.caption.slice(0, 32)}...
                              </span>
                            ))}
                            {streamClips.length > 4 && (
                              <span className="text-[#808495]">+{streamClips.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================= SECTION 2: MULTI-CAMERA LIVE GRID ================= */}
          {activeNav === 'Multi-Camera Live Grid' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span>📺 Multi-Camera Surveillance Grid</span>
                  </h2>
                  <p className="text-xs text-[#a3a8b8] mt-0.5">
                    Real-time temporal monitoring matrix with bounding box target tracking across all ingested streams.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#808495]">Time elapsed: {Math.floor(animTime)}s</span>
                  <button
                    onClick={() => setAnimTime(0)}
                    className="text-xs bg-[#262730] hover:bg-[#31333f] text-[#d4d6de] px-2 py-1 rounded flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Time</span>
                  </button>
                </div>
              </div>

              {streams.length === 0 ? (
                <div className="bg-[#262730] border border-[#31333f] rounded-lg p-8 text-center text-[#808495]">
                  <p className="text-sm font-semibold text-white">No active camera feeds.</p>
                  <p className="text-xs mt-1">Add videos using the sidebar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {streams.map((s) => {
                    return (
                      <div
                        key={s.stream_id}
                        className="bg-[#1b1c24] border border-[#31333f] rounded-lg overflow-hidden flex flex-col shadow-lg"
                      >
                        {/* Video Player or Simulated Tactical Feed */}
                        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                          {s.video_url && s.video_url.startsWith('data:video') ? (
                            <video
                              src={s.video_url}
                              controls
                              autoPlay
                              loop
                              muted
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <CameraCanvasFeed
                              camera={{
                                id: s.stream_id,
                                name: s.name,
                                fps: s.fps,
                                resolution: s.resolution,
                                zone: s.metadata?.zone,
                              }}
                              timeSeconds={animTime}
                            />
                          )}
                        </div>

                        {/* Stream Info Bar */}
                        <div className="p-3 bg-[#262730] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{s.name}</span>
                            <span className="text-[#808495] ml-2 font-mono">[{s.stream_id}]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-green-400 font-mono">LIVE 30FPS</span>
                            <button
                              onClick={() => {
                                setSelectedCamFilter(s.stream_id);
                                setActiveNav('Temporal NL Search');
                              }}
                              className="text-[11px] bg-[#31333f] hover:bg-[#ff4b4b] text-white px-2 py-0.5 rounded transition"
                            >
                              Search Cam
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 3: TEMPORAL NL SEARCH ================= */}
          {activeNav === 'Temporal NL Search' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>🔍 Natural Language Temporal Video Retrieval</span>
                </h2>
                <p className="text-xs text-[#a3a8b8] mt-0.5">
                  Search across all ingested camera feeds using natural language queries with spatial-temporal localization.
                </p>
              </div>

              {/* Search Form Card (Streamlit st.text_input & st.slider) */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white block mb-1.5">
                    Search Query (Natural Language)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. person in red jacket running near gate, black SUV turning into parking spot, unattended backpack"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
                      className="flex-1 bg-[#1e2029] border border-[#3c3f4e] rounded px-3 py-2 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                    />
                    <button
                      onClick={handleExecuteSearch}
                      disabled={loadingState || !searchQuery.trim()}
                      className="bg-[#ff4b4b] hover:bg-[#ff3333] disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded transition flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Search Streams
                    </button>
                  </div>
                </div>

                {/* Example Quick Queries */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[#808495]">Suggested Queries:</span>
                  {[
                    'person in dark jacket scanning badge at main gate',
                    'black SUV turning into parking lot spot B4',
                    'individual in red jacket running along fence',
                    'unattended dark backpack left beside perimeter fence',
                    'forklift moving pallets at loading dock',
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(q);
                      }}
                      className="bg-[#1e2029] hover:bg-[#31333f] text-[#d4d6de] border border-[#3c3f4e] px-2 py-0.5 rounded text-[11px] transition truncate max-w-xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#31333f]">
                  {/* Camera Filter */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a3a8b8] block mb-1">
                      Camera Stream Filter
                    </label>
                    <select
                      value={selectedCamFilter}
                      onChange={(e) => setSelectedCamFilter(e.target.value)}
                      className="w-full bg-[#1e2029] border border-[#3c3f4e] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff4b4b]"
                    >
                      <option value="ALL">All Active Streams ({streams.length})</option>
                      {streams.map((s) => (
                        <option key={s.stream_id} value={s.stream_id}>
                          {s.stream_id}: {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Temporal Window Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-[#a3a8b8] mb-1">
                      <span>Time Window Filter</span>
                      <span className="font-mono text-white">
                        {timeMin}s - {timeMax}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="300"
                        value={timeMax}
                        onChange={(e) => setTimeMax(Number(e.target.value))}
                        className="w-full accent-[#ff4b4b]"
                      />
                    </div>
                  </div>

                  {/* Temporal Re-ranking Checkbox */}
                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="rerank-check"
                      checked={enableRerank}
                      onChange={(e) => setEnableRerank(e.target.checked)}
                      className="w-4 h-4 accent-[#ff4b4b] rounded"
                    />
                    <label htmlFor="rerank-check" className="text-xs text-white font-medium cursor-pointer">
                      Enable Multi-Camera Re-ranking
                    </label>
                  </div>
                </div>
              </div>

              {/* Search Results Display */}
              {hasSearched && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Retrieved Video Segments ({searchResults.length})</span>
                      {searchLatency !== null && (
                        <span className="text-[11px] text-green-400 font-mono">
                          ⚡ {searchLatency}ms query latency
                        </span>
                      )}
                    </h3>

                    <button
                      onClick={handleRunGemini}
                      disabled={geminiLoading}
                      className="text-xs bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 px-3 py-1 rounded flex items-center gap-1.5 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{geminiLoading ? 'Reasoning with Gemini...' : 'Analyze with Gemini AI'}</span>
                    </button>
                  </div>

                  {/* Gemini Tactical Analysis Briefing */}
                  {geminiReport && (
                    <div className="bg-[#171a2e] border border-indigo-800/40 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Gemini Tactical Surveillance Briefing</span>
                      </div>
                      <p className="text-xs text-indigo-100 whitespace-pre-line leading-relaxed">
                        {geminiReport}
                      </p>
                    </div>
                  )}

                  {searchResults.length === 0 ? (
                    <div className="bg-[#262730] border border-[#31333f] rounded-lg p-6 text-center text-[#808495]">
                      <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                      <p className="text-xs font-semibold text-white">No video segments matched your query</p>
                      <p className="text-[11px] mt-1">Try expanding the time window or searching for entities like "person", "SUV", or "gate".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((clip, idx) => {
                        const stream = streams.find((s) => s.stream_id === clip.stream_id);
                        return (
                          <div
                            key={clip.clip_id}
                            className="bg-[#262730] border border-[#31333f] rounded-lg overflow-hidden flex flex-col hover:border-[#ff4b4b]/60 transition"
                          >
                            {/* Keyframe Canvas Snapshot */}
                            <div className="relative aspect-video bg-black">
                              <CameraCanvasFeed
                                camera={{
                                  id: clip.stream_id,
                                  name: stream?.name || clip.stream_id,
                                  fps: 30,
                                  resolution: '1920x1080',
                                }}
                                timeSeconds={clip.start_time}
                                highlightBbox={[0.35, 0.2, 0.2, 0.6]}
                                activeLabel={`SCORE ${(clip.score || 0.9).toFixed(2)}`}
                              />
                              <div className="absolute top-2 left-2 bg-[#ff4b4b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                #{idx + 1} MATCH
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black/70 text-green-400 text-[10px] font-mono px-1.5 py-0.5 rounded">
                                {clip.start_time}s - {clip.end_time}s
                              </div>
                            </div>

                            <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-white">{clip.stream_id}</span>
                                  <span className="text-green-400 font-mono font-bold">
                                    Sim: {((clip.score || 0.85) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-xs text-[#d4d6de] mt-1 line-clamp-2">
                                  {clip.caption}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#31333f] flex items-center justify-between text-[11px]">
                                <span className="text-[#808495]">Objects: {clip.objects.join(', ')}</span>
                                <button
                                  onClick={() => {
                                    setActiveNav('Cross-Camera Re-ID');
                                  }}
                                  className="text-[#ff4b4b] hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <span>Track Re-ID</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 4: CROSS-CAMERA RE-ID ================= */}
          {activeNav === 'Cross-Camera Re-ID' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>🎯 Cross-Camera Person & Vehicle Re-Identification (Re-ID)</span>
                </h2>
                <p className="text-xs text-[#a3a8b8] mt-0.5">
                  Track individuals or vehicles across disjoint camera views over time using appearance vectors and facility network topology.
                </p>
              </div>

              {/* Crop Picker Card */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Step 1: Select Query Entity Crop
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {crops.map((c) => {
                    const isSelected = c.crop_id === selectedCropId;
                    return (
                      <div
                        key={c.crop_id}
                        onClick={() => {
                          setSelectedCropId(c.crop_id);
                          handleExecuteReID(c.crop_id);
                        }}
                        className={`bg-[#1e2029] border rounded-lg p-2.5 cursor-pointer transition flex flex-col items-center text-center ${
                          isSelected
                            ? 'border-[#ff4b4b] bg-[#ff4b4b]/10 shadow'
                            : 'border-[#3c3f4e] hover:border-[#808495]'
                        }`}
                      >
                        <div className="w-16 h-16 rounded bg-[#11131a] border border-[#31333f] flex items-center justify-center text-2xl mb-2">
                          {c.object_class === 'car' ? '🚗' : c.object_class === 'backpack' ? '🎒' : '👤'}
                        </div>
                        <p className="text-xs font-bold text-white truncate max-w-full">{c.label}</p>
                        <p className="text-[10px] text-[#ff4b4b] font-mono mt-0.5">{c.stream_id} @ {c.timestamp}s</p>
                        <span className="mt-1 text-[9px] bg-[#31333f] text-[#a3a8b8] px-1.5 py-0.5 rounded">
                          {c.object_class.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleExecuteReID()}
                    disabled={reidLoading}
                    className="bg-[#ff4b4b] hover:bg-[#ff3333] text-white font-semibold text-xs px-4 py-2 rounded transition flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Run Multi-Camera Re-ID Tracker</span>
                  </button>
                </div>
              </div>

              {/* Re-ID Sightings Result */}
              {reidResults && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>
                      Cross-Camera Trajectory Sightings ({reidResults.matches.length} cameras matched)
                    </span>
                  </h3>

                  {/* Timeline Trajectory Visualizer */}
                  <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4 space-y-4">
                    <p className="text-xs text-[#a3a8b8]">
                      Subject first detected on <strong className="text-white">{reidResults.targetCrop?.stream_id}</strong> ({reidResults.targetCrop?.label}). Tracked across spatial network:
                    </p>

                    <div className="relative pl-6 border-l-2 border-[#ff4b4b] space-y-6 my-2">
                      {/* Origin point */}
                      <div className="relative">
                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#ff4b4b] border-2 border-[#262730]" />
                        <div className="bg-[#1e2029] border border-[#3c3f4e] rounded p-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white">
                              ORIGIN SIGHTING: {reidResults.targetCrop?.stream_id}
                            </span>
                            <span className="text-[#a3a8b8] font-mono">T = {reidResults.targetCrop?.timestamp}s</span>
                          </div>
                          <p className="text-xs text-[#d4d6de] mt-1">{reidResults.targetCrop?.label}</p>
                        </div>
                      </div>

                      {/* Matched transit cameras */}
                      {reidResults.matches.map((m, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-[#262730]" />
                          <div className="bg-[#1e2029] border border-green-800/40 rounded p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-green-300">
                                SIGHTING #{idx + 1}: {m.stream_id}
                              </span>
                              <span className="text-green-400 font-mono font-bold">
                                Match Confidence: {(m.reid_confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-[#d4d6de] mt-1">{m.label}</p>
                            <p className="text-[10px] text-[#808495] mt-1 font-mono">
                              Timestamp: {m.timestamp}s • Elapsed Transit Time (Δt): {m.time_diff_sec}s • Visual Sim: {(m.visual_similarity * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= SECTION 5: MEMORY & DATABASE ================= */}
          {activeNav === 'Memory & Database' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>💾 Spatial-Temporal Memory & SQLite Store</span>
                </h2>
                <p className="text-xs text-[#a3a8b8] mt-0.5">
                  Inspect persistent SQLite database tables (`data/store.db`), indexed embeddings, and query audit telemetry.
                </p>
              </div>

              {/* Database Tables View */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Table: streams (Active Ingest Feeds)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#3c3f4e] text-[#808495]">
                        <th className="pb-2">stream_id</th>
                        <th className="pb-2">name</th>
                        <th className="pb-2">source_type</th>
                        <th className="pb-2">resolution</th>
                        <th className="pb-2">fps</th>
                        <th className="pb-2">duration</th>
                        <th className="pb-2">status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#31333f]">
                      {streams.map((s) => (
                        <tr key={s.stream_id} className="text-[#d4d6de]">
                          <td className="py-2 font-mono text-[#ff4b4b]">{s.stream_id}</td>
                          <td className="py-2 font-medium text-white">{s.name}</td>
                          <td className="py-2 uppercase text-[10px]">{s.source_type}</td>
                          <td className="py-2 font-mono">{s.resolution}</td>
                          <td className="py-2">{s.fps}</td>
                          <td className="py-2">{s.duration}s</td>
                          <td className="py-2 text-green-400 font-mono text-[10px]">{s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table: Detected Crops */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Table: crops (Detected Entities for Re-ID)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#3c3f4e] text-[#808495]">
                        <th className="pb-2">crop_id</th>
                        <th className="pb-2">stream_id</th>
                        <th className="pb-2">timestamp</th>
                        <th className="pb-2">object_class</th>
                        <th className="pb-2">confidence</th>
                        <th className="pb-2">label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#31333f]">
                      {crops.map((cr) => (
                        <tr key={cr.crop_id} className="text-[#d4d6de]">
                          <td className="py-2 font-mono text-purple-400">{cr.crop_id}</td>
                          <td className="py-2 font-mono text-[#ff4b4b]">{cr.stream_id}</td>
                          <td className="py-2 font-mono">{cr.timestamp}s</td>
                          <td className="py-2 capitalize">{cr.object_class}</td>
                          <td className="py-2 font-mono text-green-400">{(cr.confidence * 100).toFixed(0)}%</td>
                          <td className="py-2 text-white">{cr.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table: Query Audit Logs */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Table: queries (Audit Log of Natural Language Searches)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#3c3f4e] text-[#808495]">
                        <th className="pb-2">id</th>
                        <th className="pb-2">query_text</th>
                        <th className="pb-2">results_count</th>
                        <th className="pb-2">latency_ms</th>
                        <th className="pb-2">executed_at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#31333f]">
                      {queryLogs.map((q) => (
                        <tr key={q.id} className="text-[#d4d6de]">
                          <td className="py-2 font-mono">{q.id}</td>
                          <td className="py-2 font-medium text-white">{q.query_text}</td>
                          <td className="py-2">{q.results_count}</td>
                          <td className="py-2 font-mono text-green-400">{q.latency_ms} ms</td>
                          <td className="py-2 font-mono text-[#808495]">{new Date(q.executed_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SECTION 6: EVALUATION & ABLATION ================= */}
          {activeNav === 'Evaluation & Ablation' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>📊 Benchmark Evaluation & System Ablation</span>
                </h2>
                <p className="text-xs text-[#a3a8b8] mt-0.5">
                  Quantitative performance comparison of lexical baselines vs dense multi-modal temporal retrieval.
                </p>
              </div>

              {/* Ablation Table Card */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ablation Study: Architecture Pipeline Breakdown
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#3c3f4e] text-[#808495]">
                        <th className="pb-2">Pipeline Configuration</th>
                        <th className="pb-2">Recall@1</th>
                        <th className="pb-2">Recall@5</th>
                        <th className="pb-2">MRR</th>
                        <th className="pb-2">Latency (ms)</th>
                        <th className="pb-2">Cross-Cam Re-ID Acc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#31333f]">
                      {ablationData.map((item, idx) => {
                        const isProposed = idx === ablationData.length - 1;
                        return (
                          <tr
                            key={idx}
                            className={`${isProposed ? 'bg-[#ff4b4b]/10 font-bold text-white' : 'text-[#d4d6de]'}`}
                          >
                            <td className="py-3 font-semibold">{item.pipeline}</td>
                            <td className="py-3 font-mono text-blue-400">{item.recall1.toFixed(2)}</td>
                            <td className="py-3 font-mono text-green-400">{item.recall5.toFixed(2)}</td>
                            <td className="py-3 font-mono text-amber-400">{item.mrr.toFixed(2)}</td>
                            <td className="py-3 font-mono">{item.latencyMs.toFixed(1)} ms</td>
                            <td className="py-3 font-mono text-purple-400">{item.crossCamAccuracy.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-[#31333f] text-xs text-[#a3a8b8] space-y-1">
                  <p>
                    <strong>Key Finding:</strong> Combining dense multimodal embeddings with temporal windowing and cross-camera Re-ID boosts Mean Reciprocal Rank (MRR) from <span className="text-amber-400">0.44</span> to <span className="text-green-400">0.91</span>.
                  </p>
                </div>
              </div>

              {/* Evaluation Benchmark Queries */}
              <div className="bg-[#262730] border border-[#31333f] rounded-lg p-5 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Benchmark Test Suite (`eval/queries.json`)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'q1', query: 'person in dark jacket entering through main gate', cam: 'CAM_01', cat: 'person_access' },
                    { id: 'q2', query: 'black SUV turning into parking lot spot B4', cam: 'CAM_02', cat: 'vehicle_parking' },
                    { id: 'q3', query: 'unattended backpack left beside perimeter fence', cam: 'CAM_04', cat: 'suspicious_object' },
                    { id: 'q4', query: 'forklift moving pallets at loading dock', cam: 'CAM_03', cat: 'equipment_operation' },
                  ].map((bq) => (
                    <div key={bq.id} className="bg-[#1e2029] border border-[#3c3f4e] rounded p-3 text-xs">
                      <div className="flex justify-between items-center text-[#ff4b4b] font-mono text-[10px]">
                        <span>[{bq.id}] {bq.cat}</span>
                        <span>{bq.cam}</span>
                      </div>
                      <p className="text-white font-medium mt-1">"{bq.query}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

// Canvas Feed Component for smooth rendering
const CameraCanvasFeed: React.FC<{
  camera: { id: string; name: string; fps: number; resolution: string; zone?: string };
  timeSeconds: number;
  highlightBbox?: [number, number, number, number] | null;
  activeLabel?: string;
}> = ({ camera, timeSeconds, highlightBbox, activeLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderSurveillanceFrame(canvasRef.current, camera, timeSeconds, highlightBbox, activeLabel);
    }
  }, [camera, timeSeconds, highlightBbox, activeLabel]);

  return <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover" />;
};
