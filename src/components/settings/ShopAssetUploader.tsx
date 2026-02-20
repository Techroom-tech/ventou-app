import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, X, RefreshCw, Camera, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShopAssetUploaderProps {
  label: string;
  asset: 'logo' | 'banner' | 'favicon';
  currentUrl: string;
  shopId: string;
  onChange: (url: string) => void;
  aspectRatio?: '1:1' | '16:9' | 'favicon';
  maxSizeMB?: number;
}

// ─── Config per asset ─────────────────────────────────────────────────────────

const ASSET_CONFIG = {
  logo:    { maxWidth: 400,  quality: 0.9,  hint: 'Recommandé : 400 × 400 px' },
  banner:  { maxWidth: 1600, quality: 0.85, hint: 'Recommandé : 1600 × 400 px (16:9)' },
  favicon: { maxWidth: 64,   quality: 0.95, hint: 'Recommandé : 32 × 32 px ou 64 × 64 px' },
};

const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

// ─── Compress raster images → WebP ───────────────────────────────────────────

async function compressToWebP(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ?? file),
        'image/webp',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// ─── Upload logic ─────────────────────────────────────────────────────────────

async function uploadAsset(
  file: File,
  shopId: string,
  asset: 'logo' | 'banner' | 'favicon',
  onProgress: (p: number) => void
): Promise<string> {
  const { maxWidth, quality } = ASSET_CONFIG[asset];
  const isSVG = file.type === 'image/svg+xml';

  onProgress(20);

  let uploadBlob: Blob;
  let contentType: string;

  if (isSVG) {
    uploadBlob = file;
    contentType = 'image/svg+xml';
  } else {
    uploadBlob = await compressToWebP(file, maxWidth, quality);
    contentType = 'image/webp';
  }

  onProgress(60);

  const path = `${shopId}/${asset}`;

  const { error: uploadError } = await supabase.storage
    .from('shop-assets')
    .upload(path, uploadBlob, { contentType, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  onProgress(90);

  const { data } = supabase.storage.from('shop-assets').getPublicUrl(path);

  // Cache-bust so the browser re-fetches the same path
  const url = `${data.publicUrl}?t=${Date.now()}`;

  onProgress(100);
  return url;
}

// ─── Aspect ratio classes ─────────────────────────────────────────────────────

function zoneClass(aspectRatio: ShopAssetUploaderProps['aspectRatio']) {
  if (aspectRatio === '16:9') return 'aspect-video';
  if (aspectRatio === 'favicon') return 'h-20 w-20';
  return 'aspect-square max-h-28 max-w-28';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ShopAssetUploader({
  label,
  asset,
  currentUrl,
  shopId,
  onChange,
  aspectRatio = '1:1',
  maxSizeMB = 2,
}: ShopAssetUploaderProps) {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { hint } = ASSET_CONFIG[asset];
  const isBanner = aspectRatio === '16:9';
  const isLogo   = aspectRatio === '1:1';
  const isFavicon = aspectRatio === 'favicon';

  // ── Validate and upload ──────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setError('Format non supporté. Utilisez PNG, JPG, SVG ou WebP.');
      return;
    }

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > maxSizeMB) {
      setError(`Fichier trop lourd (max ${maxSizeMB} Mo). Taille actuelle : ${sizeMB.toFixed(1)} Mo.`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const url = await uploadAsset(file, shopId, asset, setProgress);
      onChange(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'upload.';
      setError(msg);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [asset, shopId, maxSizeMB, onChange]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleRemove = () => {
    onChange('');
    setError(null);
  };

  // ── Hidden file input (shared) ───────────────────────────────────────────

  const FileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/svg+xml,image/webp"
      className="hidden"
      onChange={onInputChange}
    />
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ══════════════════════════════════════════════════════════════════════════

  if (isMobile) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          {/* Thumbnail */}
          <div
            className={cn(
              'shrink-0 overflow-hidden rounded-lg border border-border bg-background',
              isBanner ? 'w-20 h-12' : isFavicon ? 'w-10 h-10' : 'w-12 h-12'
            )}
          >
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={label}
                loading="lazy"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                <Upload className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Info + actions */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          </div>

          {/* Modify button */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 h-8 text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Camera className="h-3 w-3" />}
            Modifier
          </Button>
        </div>

        {currentUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-destructive hover:underline ml-1"
          >
            Supprimer l'image
          </button>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {error}
          </p>
        )}

        {FileInput}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {currentUrl && !uploading && (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-primary/80">Enregistré</span>
          </div>
        )}
      </div>

      {/* Upload zone */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl border-2 transition-all duration-200',
          isBanner ? 'aspect-video' : isFavicon ? 'h-24 w-24' : 'aspect-square',
          isLogo && 'max-h-28 max-w-28',
          uploading && 'pointer-events-none opacity-80',
          !currentUrl && !uploading && dragOver && 'border-primary bg-primary/5',
          !currentUrl && !uploading && !dragOver && 'border-dashed border-border hover:border-primary/60 hover:bg-muted/40 cursor-pointer',
          currentUrl && !uploading && 'border-border group cursor-default',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !currentUrl && !uploading && inputRef.current?.click()}
      >
        {/* ── Uploading state ──────────────────────────────────────────── */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs font-medium text-muted-foreground">Upload en cours…</p>
            <div className="w-full max-w-[80%]">
              <Progress value={progress} className="h-1.5" />
            </div>
            <p className="text-[11px] text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* ── Preview state ────────────────────────────────────────────── */}
        {currentUrl && !uploading && (
          <>
            <img
              src={currentUrl}
              alt={label}
              loading="lazy"
              className={cn(
                'w-full h-full',
                isLogo || isFavicon ? 'object-contain bg-white' : 'object-cover'
              )}
            />
        {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-200">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs gap-1"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <RefreshCw className="h-3 w-3" />
                Remplacer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs gap-1"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
              >
                <X className="h-3 w-3" />
                Supprimer
              </Button>
            </div>
          </>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!currentUrl && !uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            <div className="rounded-full bg-muted p-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {!isFavicon && (
              <p className="text-[11px] font-medium text-muted-foreground leading-tight">
                Glissez ou cliquez pour télécharger
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/70">
              PNG, JPG, SVG · Max {maxSizeMB} Mo
            </p>
          </div>
        )}
      </div>

      {/* Hint */}
      <p className="text-[11px] text-muted-foreground/60">{hint}</p>

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {FileInput}
    </div>
  );
}
