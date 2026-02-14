import { useState, useCallback, useRef } from 'react';
import { Upload, X, Star, GripVertical, Loader2 } from 'lucide-react';
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

async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
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
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUploader({ images, onChange, shopId }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file);
        const ext = 'webp';
        const path = `${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error } = await supabase.storage
          .from('product-images')
          .upload(path, compressed, { contentType: 'image/webp' });

        if (error) {
          console.error('Upload error:', error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);

        newImages.push({
          url: publicUrl,
          storage_path: path,
          is_primary: images.length === 0 && newImages.length === 0,
          position: images.length + newImages.length,
        });
      } catch (err) {
        console.error('Compression/upload error:', err);
      }
    }

    onChange([...images, ...newImages]);
    setUploading(false);
  }, [images, onChange, shopId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    // If removed image was primary, make first one primary
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
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
        )}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {uploading ? 'Upload en cours...' : 'Cliquer ou glisser des images'}
        </span>
        <span className="text-xs text-muted-foreground">
          PNG, JPG, WebP • Compression automatique
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

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
              <img src={img.url} alt="" className="w-full h-full object-cover" />
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
