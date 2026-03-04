import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { ShoppingBag } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from '@/hooks/use-mobile';

const ImageLightbox = lazy(() => import('./ImageLightbox'));

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Embla for mobile carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2)',
    });
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    setZoomStyle({});
  }, []);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-xl flex items-center justify-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  const mainImage = images[selectedIndex] || images[0];

  // Mobile: swipe carousel
  if (isMobile) {
    return (
      <div className="space-y-2">
        <div ref={emblaRef} className="overflow-hidden rounded-xl">
          <div className="flex">
            {images.map((img, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 aspect-square bg-muted">
                <img
                  src={img}
                  alt={`${productName} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === selectedIndex ? 'bg-foreground' : 'bg-muted-foreground/30'}`}
                onClick={() => emblaApi?.scrollTo(i)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop: main image + thumbnails with zoom + lightbox
  return (
    <>
      <div className="space-y-3">
        {/* Main image with zoom */}
        <div
          ref={mainRef}
          className="aspect-square bg-muted rounded-xl overflow-hidden cursor-crosshair relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={mainImage}
            alt={productName}
            className="w-full h-full object-cover transition-transform duration-150"
            style={zoomStyle}
            loading="eager"
          />
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                  i === selectedIndex ? 'border-primary' : 'border-transparent hover:border-muted-foreground/50'
                }`}
              >
                <img
                  src={img}
                  alt={`${productName} ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Suspense fallback={null}>
          <ImageLightbox
            images={images}
            currentIndex={selectedIndex}
            onClose={() => setLightboxOpen(false)}
            onChangeIndex={setSelectedIndex}
          />
        </Suspense>
      )}
    </>
  );
}
