import { useState, useCallback, useRef } from 'react';
import { Upload, X, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UploadedImage {
  id?: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  position: number;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  shopId: string;
}

async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/webp',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUploader({ images, onChange, shopId }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setUploadError(null);
    const newImages: UploadedImage[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file);
        const path = `${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

        if (import.meta.env.DEV) console.log('[ImageUploader] Uploading to path:', path);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, compressed, { contentType: 'image/webp', upsert: false });

        if (uploadError) {
          console.error('[ImageUploader] Upload error:', uploadError);
          setUploadError(`Erreur upload: ${uploadError.message}`);
          continue;
        }

        if (import.meta.env.DEV) console.log('[ImageUploader] Upload success:', uploadData);

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);

        if (import.meta.env.DEV) console.log('[ImageUploader] Public URL:', urlData.publicUrl);

        newImages.push({
          url: urlData.publicUrl,
          storage_path: path,
          is_primary: images.length === 0 && newImages.length === 0,
          position: images.length + newImages.length,
        });
      } catch (err) {
        console.error('[ImageUploader] Unexpected error:', err);
        setUploadError('Erreur inattendue lors de l\'upload');
      }
    }

    if (newImages.length > 0) {
      const updated = [...images, ...newImages];
      if (import.meta.env.DEV) console.log('[ImageUploader] Updated images state:', updated);
      onChange(updated);
    }
    setUploading(false);
  }, [images, onChange, shopId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    if (images[index].is_primary && updated.length > 0) {
      updated[0] = { ...updated[0], is_primary: true };
    }
    onChange(updated.map((img, i) => ({ ...img, position: i })));
  };

  const setPrimary = (index: number) => {
    onChange(images.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors',
          uploading ? 'cursor-wait opacity-70' : 'cursor-pointer',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <span className="text-sm font-medium">Upload en cours...</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Cliquer ou glisser des images</span>
            <span className="text-xs text-muted-foreground">PNG, JPG, WebP • Compression automatique</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {uploadError && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{uploadError}</p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img.storage_path}
              className={cn(
                'relative group aspect-square rounded-lg overflow-hidden border-2 transition-colors',
                img.is_primary ? 'border-primary' : 'border-border'
              )}
            >
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('[ImageUploader] Image load error for:', img.url);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setPrimary(i)}
                className={cn(
                  'absolute bottom-1 left-1 rounded-full p-1 transition-opacity',
                  img.is_primary
                    ? 'bg-primary text-primary-foreground opacity-100'
                    : 'bg-foreground/60 text-background opacity-0 group-hover:opacity-100'
                )}
              >
                <Star className="h-3 w-3" />
              </button>
              {img.is_primary && (
                <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                  Principale
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
