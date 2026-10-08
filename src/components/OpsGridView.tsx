import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Grid,
  Radio,
  Sliders,
  Layers,
  Sparkles,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Search,
  Users
} from 'lucide-react';
import { StreamItem, CropItem } from '../types';
import { renderSurveillanceFrame } from '../utils/canvasVideoSimulator';

interface OpsGridViewProps {
  streams: StreamItem[];
  crops: CropItem[];
  onSelectCameraToSearch: (cameraId: string) => void;
  onOpenReID: (cropId: string) => void;
  onOpenUploadModal: () => void;
}

export const OpsGridView: React.FC<OpsGridViewProps> = ({
  streams,
  crops,
  onSelectCameraToSearch,
  onOpenReID,
  onOpenUploadModal,
}) => {
  const [layout, setLayout] = useState<'2x2' | '1+3' | '3x3'>('2x2');
  const [selectedCamId, setSelectedCamId] = useState<string>(streams[0]?.stream_id || 'CAM_01');
  const [animTime, setAnimTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimTime((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const primaryCam = streams.find((s) => s.stream_id === selectedCamId) || streams[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] text-[#e2e8f0] overflow-hidden">
      {/* Top Ops Bar */}
      <div className="h-14 border-b border-[#1e293b] px-6 flex items-center justify-between bg-[#0b0f19] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
              Surveillance Ops Matrix
            </h2>
          </div>
          <span className="text-xs bg-[#1e293b] text-cyan-400 font-mono px-2 py-0.5 rounded border border-cyan-800/40">
            {streams.length} STREAMS ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Layout Switcher */}
          <div className="flex bg-[#1e293b] rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => setLayout('2x2')}
              className={`px-2.5 py-1 rounded transition ${
                layout === '2x2' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              2x2
            </button>
            <button
              onClick={() => setLayout('1+3')}
              className={`px-2.5 py-1 rounded transition ${
                layout === '1+3' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              1+FOCUS
            </button>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-xs bg-[#1e293b] hover:bg-[#334155] text-slate-300 px-3 py-1.5 rounded flex items-center gap-1.5"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-green-400" />}
            <span className="font-mono">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={onOpenUploadModal}
            className="text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition shadow"
          >
            <span>+ ADD STREAM</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 p-4 overflow-y-auto">
        {layout === '2x2' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {streams.slice(0, 4).map((s) => (
              <CameraTile
                key={s.stream_id}
                stream={s}
                animTime={animTime}
                onSearch={() => onSelectCameraToSearch(s.stream_id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Primary Focus Camera */}
            <div className="lg:col-span-2 flex flex-col bg-[#111827] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl">
              {primaryCam && (
                <CameraTile
                  stream={primaryCam}
                  animTime={animTime}
                  isPrimary
                  onSearch={() => onSelectCameraToSearch(primaryCam.stream_id)}
                />
              )}
            </div>

            {/* Sidebar Feeds */}
            <div className="space-y-4 flex flex-col">
              <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Select Camera Focus
              </h3>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {streams.map((s) => (
                  <div
                    key={s.stream_id}
                    onClick={() => setSelectedCamId(s.stream_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      selectedCamId === s.stream_id
                        ? 'border-cyan-500 bg-cyan-950/30'
                        : 'border-[#1e293b] bg-[#111827] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white font-mono">{s.stream_id}</span>
                      <span className="text-[10px] text-green-400 font-mono">LIVE 30FPS</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{s.resolution} • {s.source_type}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CameraTile: React.FC<{
  stream: StreamItem;
  animTime: number;
  isPrimary?: boolean;
  onSearch: () => void;
}> = ({ stream, animTime, onSearch }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderSurveillanceFrame(
        canvasRef.current,
        {
          id: stream.stream_id,
          name: stream.name,
          fps: stream.fps,
          resolution: stream.resolution,
          zone: stream.metadata?.zone,
        },
        animTime
      );
    }
  }, [stream, animTime]);

  return (
    <div className="relative aspect-video bg-black border border-[#1e293b] rounded-lg overflow-hidden flex flex-col group">
      {stream.video_url && stream.video_url.startsWith('data:video') ? (
        <video
          src={stream.video_url}
          controls
          autoPlay
          loop
          muted
          className="w-full h-full object-contain"
        />
      ) : (
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover" />
      )}

      {/* Floating Action Overlay on Hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5 bg-black/80 p-1 rounded backdrop-blur border border-slate-700">
        <button
          onClick={onSearch}
          className="text-[11px] bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-2 py-0.5 rounded flex items-center gap-1"
        >
          <Search className="w-3 h-3" />
          <span>NL Search</span>
        </button>
      </div>
    </div>
  );
};
