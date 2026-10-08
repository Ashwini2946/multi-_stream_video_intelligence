import React, { useState } from 'react';
import { X, Upload, Video, Radio, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface ManualVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFile: (file: File, name: string, zone: string) => Promise<void>;
  onAddManualUrl: (name: string, url: string, zone: string) => Promise<void>;
  onLoadPreset: (name: string, url: string, zone: string) => Promise<void>;
}

export const ManualVideoModal: React.FC<ManualVideoModalProps> = ({
  isOpen,
  onClose,
  onUploadFile,
  onAddManualUrl,
  onLoadPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'preset'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [zone, setZone] = useState('Zone 1: Perimeter');
  const [url, setUrl] = useState('');
  const [preset, setPreset] = useState('CAM_01: Building Main Entrance');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === 'upload' && file) {
        setProgress(30);
        const timer = setInterval(() => setProgress((p) => (p < 80 ? p + 25 : p)), 150);
        await onUploadFile(file, name, zone);
        clearInterval(timer);
        setProgress(100);
      } else if (activeTab === 'url' && url) {
        await onAddManualUrl(name || 'IP Camera Stream', url, zone);
      } else if (activeTab === 'preset') {
        const [code, label] = preset.split(':');
        await onLoadPreset(`${code.trim()}: ${label.trim()}`, `preset://${code.toLowerCase().trim()}`, 'Preset Facility Zone');
      }
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 500);
    } catch (err) {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1b1c24] border border-[#31333f] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl text-[#fafafa] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#31333f] flex items-center justify-between bg-[#262730]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📹</span>
            <div>
              <h3 className="text-sm font-bold text-white">Add Video Stream Manually</h3>
              <p className="text-xs text-[#a3a8b8]">Upload video file or connect RTSP / network camera feed</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#808495] hover:text-white p-1 rounded transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#31333f] bg-[#1b1c24] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'upload'
                ? 'border-[#ff4b4b] text-[#ff4b4b] bg-[#ff4b4b]/5'
                : 'border-transparent text-[#808495] hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'url'
                ? 'border-[#ff4b4b] text-[#ff4b4b] bg-[#ff4b4b]/5'
                : 'border-transparent text-[#808495] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>URL / RTSP</span>
          </button>

          <button
            onClick={() => setActiveTab('preset')}
            className={`flex-1 py-2.5 text-center transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'preset'
                ? 'border-[#ff4b4b] text-[#ff4b4b] bg-[#ff4b4b]/5'
                : 'border-transparent text-[#808495] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Facility Presets</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {activeTab === 'upload' && (
            <>
              <div className="border-2 border-dashed border-[#464855] hover:border-[#ff4b4b] rounded-lg p-5 text-center bg-[#14151b] transition">
                <input
                  type="file"
                  id="modal-file-upload"
                  accept="video/mp4,video/webm,video/mov,video/avi,video/mkv,.mp4,.webm,.mov,.avi,.mkv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="modal-file-upload" className="cursor-pointer block">
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-green-400' : 'text-[#808495]'}`} />
                  {file ? (
                    <div>
                      <p className="text-xs font-semibold text-green-300">{file.name}</p>
                      <p className="text-[10px] text-[#a3a8b8] mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-white">Click or drag & drop video file</p>
                      <p className="text-[10px] text-[#808495] mt-1">MP4, WEBM, MOV, AVI up to 200MB</p>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-[#a3a8b8] block mb-1">Camera Feed Name</label>
                <input
                  type="text"
                  placeholder="e.g. Loading Dock Gate 02"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#14151b] border border-[#3c3f4e] rounded px-3 py-1.5 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#a3a8b8] block mb-1">Surveillance Zone</label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-[#14151b] border border-[#3c3f4e] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff4b4b]"
                >
                  <option value="Zone 1: Perimeter">Zone 1: Perimeter</option>
                  <option value="Zone 2: Main Lobby">Zone 2: Main Lobby</option>
                  <option value="Zone 3: Parking Garage">Zone 3: Parking Garage</option>
                  <option value="Zone 4: Loading Dock">Zone 4: Loading Dock</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'url' && (
            <>
              <div>
                <label className="text-xs font-medium text-[#a3a8b8] block mb-1">Stream URL / RTSP Feed</label>
                <input
                  type="text"
                  placeholder="rtsp://192.168.1.120:554/h264 or https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#14151b] border border-[#3c3f4e] rounded px-3 py-1.5 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#a3a8b8] block mb-1">Camera Feed Name</label>
                <input
                  type="text"
                  placeholder="e.g. IP Cam Entrance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#14151b] border border-[#3c3f4e] rounded px-3 py-1.5 text-xs text-white placeholder-[#606474] focus:outline-none focus:border-[#ff4b4b]"
                />
              </div>
            </>
          )}

          {activeTab === 'preset' && (
            <div>
              <label className="text-xs font-medium text-[#a3a8b8] block mb-1">Select Facility Camera</label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="w-full bg-[#14151b] border border-[#3c3f4e] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff4b4b]"
              >
                <option value="CAM_01: Building Main Entrance">CAM_01: Building Main Entrance</option>
                <option value="CAM_02: Parking Structure B2">CAM_02: Parking Structure B2</option>
                <option value="CAM_03: Warehouse Loading Dock">CAM_03: Warehouse Loading Dock</option>
                <option value="CAM_04: Perimeter East Fence">CAM_04: Perimeter East Fence</option>
                <option value="CAM_05: Main Lobby & Reception">CAM_05: Main Lobby & Reception</option>
              </select>
            </div>
          )}

          {progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#a3a8b8]">
                <span>Processing & Vectorizing...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#31333f] rounded-full overflow-hidden">
                <div className="h-full bg-[#ff4b4b] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#31333f] bg-[#262730] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs bg-[#1e2029] hover:bg-[#31333f] text-[#d4d6de] px-4 py-2 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (activeTab === 'upload' && !file) || (activeTab === 'url' && !url)}
            className="text-xs bg-[#ff4b4b] hover:bg-[#ff3333] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded transition flex items-center gap-1.5 shadow"
          >
            {isSubmitting ? 'Processing...' : 'Add Stream to System'}
          </button>
        </div>
      </div>
    </div>
  );
};
