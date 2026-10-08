/**
 * Animated Canvas Surveillance Renderer.
 * Generates realistic tactical CCTV feeds for cameras when a direct video file
 * or stream URL is simulated. Includes timecode, camera ID, entity motion,
 * bounding box target tracking, and CCTV scanline aesthetics.
 */

export function renderSurveillanceFrame(
  canvas: HTMLCanvasElement,
  camera: {
    id: string;
    name: string;
    fps: number;
    resolution: string;
    zone?: string;
  },
  timeSeconds: number,
  highlightBbox?: [number, number, number, number] | null,
  activeEntityLabel?: string
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Camera specific color scheme / background tone
  let bgGradient: CanvasGradient;
  const camNum = parseInt(camera.id.replace(/\D/g, '') || '1', 10);

  if (camNum === 1) {
    // Cam 1: Main Entrance Foyer - cool corporate blue-gray
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#111827');
    bgGradient.addColorStop(1, '#1f2937');
  } else if (camNum === 2) {
    // Cam 2: Parking Structure - dim subterranean concrete yellow-green
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#1e293b');
  } else if (camNum === 3) {
    // Cam 3: Warehouse Loading Dock - industrial amber tint
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#1c1917');
    bgGradient.addColorStop(1, '#292524');
  } else {
    // Cam 4: Perimeter Fence - night vision greenish monochromatic
    bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#062014');
    bgGradient.addColorStop(1, '#0c3520');
  }

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw architectural perspective lines (flooring grid / perimeter fences)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  // Grid vanishing lines
  const vanishingY = height * 0.45;
  for (let x = -width; x <= width * 2; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(width * 0.5, vanishingY);
    ctx.stroke();
  }

  // Horizontal floor depth lines
  for (let y = vanishingY; y < height; y += (height - y) * 0.22 + 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw simulated dynamic moving entities based on timeSeconds
  const cycleTime = (timeSeconds % 60);

  // Entity 1: Person walking / jogging
  const pSpeed = (cycleTime * 18) % (width + 100);
  const px = (width + 50) - pSpeed;
  const py = height * 0.52 + Math.sin(cycleTime * 4) * 3;
  const pScale = 0.85 + (py / height) * 0.35;

  // Person silhouette
  ctx.fillStyle = camNum === 4 ? '#22c55e' : (camNum === 1 && cycleTime > 35 ? '#ef4444' : '#94a3b8');
  ctx.beginPath();
  // Head
  ctx.arc(px, py - 35 * pScale, 8 * pScale, 0, Math.PI * 2);
  ctx.fill();
  // Torso
  ctx.fillRect(px - 7 * pScale, py - 25 * pScale, 14 * pScale, 28 * pScale);
  // Legs animation
  const legOffset = Math.sin(cycleTime * 8) * 8 * pScale;
  ctx.fillRect(px - 6 * pScale, py + 3 * pScale, 4 * pScale, 22 * pScale + legOffset);
  ctx.fillRect(px + 2 * pScale, py + 3 * pScale, 4 * pScale, 22 * pScale - legOffset);

  // Bounding box on moving person
  const pBoxX = px - 16 * pScale;
  const pBoxY = py - 46 * pScale;
  const pBoxW = 32 * pScale;
  const pBoxH = 75 * pScale;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pBoxX, pBoxY, pBoxW, pBoxH);

  // Label tag
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(pBoxX, pBoxY - 14, 86, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('PERSON 0.94', pBoxX + 4, pBoxY - 4);

  // Entity 2: In Cam 2 & 3, draw a vehicle/forklift moving
  if (camNum === 2 || camNum === 3) {
    const vx = 60 + ((cycleTime * 25) % (width * 0.6));
    const vy = height * 0.65;
    ctx.fillStyle = '#0284c7';
    // Car body
    ctx.fillRect(vx, vy, 110, 36);
    ctx.fillRect(vx + 20, vy - 22, 60, 24);
    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(vx + 25, vy + 36, 12, 0, Math.PI * 2);
    ctx.arc(vx + 85, vy + 36, 12, 0, Math.PI * 2);
    ctx.fill();

    // Vehicle Bounding box
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(vx - 5, vy - 26, 120, 74);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(vx - 5, vy - 40, 92, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(camNum === 2 ? 'CAR/SUV 0.96' : 'FORKLIFT 0.91', vx, vy - 30);
  }

  // Draw manual highlight bbox if specified by temporal query or crop selection
  if (highlightBbox) {
    const [bx, by, bw, bh] = highlightBbox;
    const hx = bx * width;
    const hy = by * height;
    const hw = bw * width;
    const hh = bh * height;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(hx, hy, hw, hh);

    // Corner brackets
    const bLen = 10;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(hx, hy + bLen); ctx.lineTo(hx, hy); ctx.lineTo(hx + bLen, hy);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(hx + hw - bLen, hy); ctx.lineTo(hx + hw, hy); ctx.lineTo(hx + hw, hy + bLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(hx, hy + hh - bLen); ctx.lineTo(hx, hy + hh); ctx.lineTo(hx + bLen, hy + hh);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(hx + hw - bLen, hy + hh); ctx.lineTo(hx + hw, hy + hh); ctx.lineTo(hx + hw, hy + hh - bLen);
    ctx.stroke();

    if (activeEntityLabel) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(hx, hy - 16, Math.max(100, activeEntityLabel.length * 7), 16);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(activeEntityLabel, hx + 4, hy - 4);
    }
  }

  // Tactical CCTV HUD Overlays (Top bar)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, width, 28);
  ctx.fillRect(0, height - 24, width, 24);

  // Top Left: Recording pill + Camera ID
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(12, 14, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`● REC [${camera.id}] ${camera.name.toUpperCase()}`, 24, 18);

  // Top Right: Live Date & Timecode
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeMs = Math.floor(timeSeconds % 1 * 100);
  const mins = Math.floor(timeSeconds / 60);
  const secs = Math.floor(timeSeconds % 60);
  const timecode = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(timeMs).padStart(2, '0')}`;

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`${dateStr} ${timecode} [${camera.fps} FPS]`, width - 230, 18);

  // Bottom bar: Zone & Telemetry
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(`ZONE: ${camera.zone || 'SEC-A'} | RES: ${camera.resolution} | BITRATE: 4120 kbps | CODEC: H.264`, 10, height - 8);

  // Subtle Scanline Noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
}
