import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, RotateCcw, Check } from 'lucide-react';

// ─── Colour utilities ────────────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), max === 0 ? 0 : Math.round((d / max) * 100), Math.round(max * 100)];
}

function hsvToHex(h: number, s: number, v: number): string {
  const hh = h / 360, ss = s / 100, vv = v / 100;
  const i = Math.floor(hh * 6);
  const f = hh * 6 - i;
  const p = vv * (1 - ss), q = vv * (1 - f * ss), t = vv * (1 - (1 - f) * ss);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = vv; g = t; b = p; break;
    case 1: r = q; g = vv; b = p; break;
    case 2: r = p; g = vv; b = t; break;
    case 3: r = p; g = q; b = vv; break;
    case 4: r = t; g = p; b = vv; break;
    case 5: r = vv; g = p; b = q; break;
  }
  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function isValidHex(h: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(h);
}

const RECENT_COLORS_KEY = 'ventou_recent_colors';
const MAX_RECENT = 8;

function getRecentColors(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveRecentColor(hex: string) {
  const colors = [hex, ...getRecentColors().filter(c => c !== hex)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors));
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AdvancedColorPickerProps {
  value: string;          // hex e.g. "#FF6B35"
  defaultValue?: string;  // for reset button
  onChange: (hex: string) => void;
  onClose?: () => void;
}

export function AdvancedColorPicker({ value, defaultValue, onChange, onClose }: AdvancedColorPickerProps) {
  const safeHex = isValidHex(value) ? value : '#1E3A5F';
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(safeHex));
  const [hexInput, setHexInput] = useState(safeHex.toUpperCase());
  const [opacity, setOpacity] = useState(100);
  const [copied, setCopied] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  // Sync when external value changes
  useEffect(() => {
    if (!isValidHex(value)) return;
    const newHsv = hexToHsv(value);
    setHsv(newHsv);
    setHexInput(value.toUpperCase());
  }, [value]);

  // Draw gradient canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    // White → hue gradient (horizontal)
    const hueColor = hsvToHex(hsv[0], 100, 100);
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, hueColor);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);
    // Transparent → black gradient (vertical)
    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, [hsv[0]]);

  const pickFromCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const s = Math.round(x * 100);
    const v = Math.round((1 - y) * 100);
    const newHsv: [number, number, number] = [hsv[0], s, v];
    setHsv(newHsv);
    const hex = hsvToHex(...newHsv);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  }, [hsv, onChange]);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    pickFromCanvas(e);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) pickFromCanvas(e); };
    const onUp = () => { if (dragging.current) { dragging.current = false; saveRecentColor(hsvToHex(...hsv)); setRecentColors(getRecentColors()); } };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [pickFromCanvas, hsv]);

  const handleHueChange = (h: number) => {
    const newHsv: [number, number, number] = [h, hsv[1], hsv[2]];
    setHsv(newHsv);
    const hex = hsvToHex(...newHsv);
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  const handleHexInput = (raw: string) => {
    setHexInput(raw);
    const hex = raw.startsWith('#') ? raw : '#' + raw;
    if (isValidHex(hex)) {
      setHsv(hexToHsv(hex));
      onChange(hex);
    }
  };

  const handleHexBlur = () => {
    if (isValidHex(hexInput) || isValidHex('#' + hexInput)) {
      const hex = hexInput.startsWith('#') ? hexInput : '#' + hexInput;
      saveRecentColor(hex);
      setRecentColors(getRecentColors());
    }
  };

  const handleRgbChange = (channel: 0 | 1 | 2, val: number) => {
    const rgb = hexToRgb(safeHex) as [number, number, number];
    rgb[channel] = Math.max(0, Math.min(255, val));
    const hex = '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
    setHsv(hexToHsv(hex));
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(hexInput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleReset = () => {
    if (!defaultValue) return;
    const hex = defaultValue;
    setHsv(hexToHsv(hex));
    setHexInput(hex.toUpperCase());
    onChange(hex);
  };

  // Cursor position on canvas
  const [cx, cy] = [
    (hsv[1] / 100) * (canvasRef.current?.offsetWidth ?? 200),
    (1 - hsv[2] / 100) * (canvasRef.current?.offsetHeight ?? 120),
  ];

  const [r, g, b] = hexToRgb(safeHex);
  const currentHex = hsvToHex(...hsv);

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg p-3 space-y-3 w-full max-w-xs select-none" onClick={e => e.stopPropagation()}>
      {/* Gradient canvas */}
      <div className="relative rounded-lg overflow-hidden cursor-crosshair" style={{ height: 120 }}>
        <canvas
          ref={canvasRef}
          width={280}
          height={120}
          className="w-full h-full block"
          onMouseDown={onMouseDown}
        />
        {/* Cursor circle */}
        <div
          className="pointer-events-none absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2"
          style={{ left: cx, top: cy, backgroundColor: currentHex }}
        />
      </div>

      {/* Hue slider */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Teinte</label>
        <input
          type="range"
          min={0}
          max={360}
          value={hsv[0]}
          onChange={e => handleHueChange(Number(e.target.value))}
          className="w-full h-3 rounded-full cursor-pointer appearance-none"
          style={{
            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          }}
        />
      </div>

      {/* Opacity slider */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Opacité — {opacity}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={e => setOpacity(Number(e.target.value))}
          className="w-full h-3 rounded-full cursor-pointer appearance-none"
          style={{
            background: `linear-gradient(to right, transparent, ${currentHex})`,
          }}
        />
      </div>

      {/* Hex + RGB inputs */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-1.5 items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded border border-border shrink-0" style={{ backgroundColor: currentHex }} />
          <input
            type="text"
            value={hexInput}
            onChange={e => handleHexInput(e.target.value)}
            onBlur={handleHexBlur}
            className="flex-1 h-7 min-w-0 rounded border border-border bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="#000000"
            maxLength={7}
          />
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="h-7 w-7 rounded border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          title="Copier hex"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
        {defaultValue && (
          <button
            type="button"
            onClick={handleReset}
            className="h-7 w-7 rounded border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors shrink-0"
            title="Réinitialiser"
          >
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* RGB inputs */}
      <div className="grid grid-cols-3 gap-1.5">
        {(['R', 'G', 'B'] as const).map((ch, i) => (
          <div key={ch} className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground">{ch}</label>
            <input
              type="number"
              min={0}
              max={255}
              value={[r, g, b][i]}
              onChange={e => handleRgbChange(i as 0 | 1 | 2, Number(e.target.value))}
              className="w-full h-7 rounded border border-border bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        ))}
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Récents</label>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {recentColors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setHsv(hexToHsv(c)); setHexInput(c.toUpperCase()); onChange(c); }}
                className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground transition-all shrink-0"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
