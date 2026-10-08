export type SourceType = 'upload' | 'url' | 'rtsp' | 'preset';
export type StreamStatus = 'ACTIVE' | 'INDEXING' | 'READY';

export interface StreamItem {
  stream_id: string;
  name: string;
  source_type: SourceType;
  file_path: string;
  video_url?: string;
  fps: number;
  duration: number;
  resolution: string;
  status: StreamStatus;
  created_at: string;
  clips_count: number;
  metadata?: {
    zone?: string;
    sensitivity?: string;
    originalName?: string;
    fileSize?: number;
    streamUrl?: string;
    [key: string]: any;
  };
}

export interface ClipItem {
  clip_id: string;
  stream_id: string;
  start_time: number;
  end_time: number;
  caption: string;
  objects: string[];
  keyframe_url?: string;
  score?: number;
  originalScore?: number;
  reranked?: boolean;
}

export interface CropItem {
  crop_id: string;
  clip_id: string;
  stream_id: string;
  timestamp: number;
  object_class: 'person' | 'car' | 'truck' | 'backpack' | 'bicycle' | string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0-1
  label: string;
  crop_data_url?: string;
}

export interface QueryLog {
  id: number;
  query_text: string;
  results_count: number;
  latency_ms: number;
  executed_at: string;
}

export interface ReIDMatch {
  crop_id: string;
  stream_id: string;
  timestamp: number;
  time_diff_sec: number;
  visual_similarity: number;
  reid_confidence: number;
  label: string;
  bbox: [number, number, number, number];
  object_class: string;
}

export interface AblationItem {
  pipeline: string;
  recall1: number;
  recall5: number;
  mrr: number;
  latencyMs: number;
  crossCamAccuracy: number;
}
