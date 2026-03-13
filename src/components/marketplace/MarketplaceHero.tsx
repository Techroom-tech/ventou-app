import { useMarketplaceBanners } from "@/hooks/useMarketplaceBanners";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceHero() {
  const { data: banners, isLoading } = useMarketplaceBanners();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    // Auto-play
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => { emblaApi.off("select", onSelect); clearInterval(interval); };
  }, [emblaApi]);

  if (isLoading) {
    return (
      <div className="w-full aspect-[21/9] md:aspect-[3/1]">
        <Skeleton className="w-full h-full rounded-2xl" />
      </div>
    );
  }

  if (!banners?.length) {
    // Default hero when no banners
    return (
      <div className="w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center p-8">
        <div className="text-center text-primary-foreground max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Bienvenue sur Ventou</h1>
          <p className="text-lg md:text-xl opacity-90">Découvrez des milliers de produits de vendeurs vérifiés à travers l'Afrique</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative aspect-[21/9] md:aspect-[3/1]">
              <img
                src={banner.image_url}
                alt={banner.title ?? "Banner"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                {banner.title && (
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">{banner.title}</h2>
                )}
                {banner.description && (
                  <p className="text-white/90 text-sm md:text-lg mb-4 max-w-xl">{banner.description}</p>
                )}
                {banner.button_link && (
                  <Button asChild size="lg" className="rounded-full">
                    <a href={banner.button_link}>{banner.button_text ?? "Découvrir"}</a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows */}
      {banners.length > 1 && (
        <>
          <button onClick={scrollPrev} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={scrollNext} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
