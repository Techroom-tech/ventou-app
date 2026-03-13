import { useMarketplaceBanners } from "@/hooks/useMarketplaceBanners";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceHero() {
  const { data: banners, isLoading } = useMarketplaceBanners();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(interval);
    };
  }, [emblaApi]);

  if (isLoading) {
    return <Skeleton className="w-full h-[300px] md:h-[420px] lg:h-[500px] rounded-2xl" />;
  }

  if (!banners?.length) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 flex items-center p-8 md:p-14 relative overflow-hidden h-[300px] md:h-[420px] lg:h-[500px]">
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Marketplace Ventou
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-3 leading-tight">
            Achetez en confiance,<br />vendez sans limites
          </h1>
          <p className="text-primary-foreground/80 text-sm md:text-lg mb-6 max-w-lg">
            Des milliers de produits de vendeurs vérifiés à travers l'Afrique.
          </p>
          <div className="flex flex-wrap gap-4 text-primary-foreground/70 text-xs md:text-sm">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Vendeurs vérifiés</span>
            <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> +1000 produits</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group rounded-2xl overflow-hidden shadow-lg">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex-[0_0_100%] min-w-0 relative h-[300px] md:h-[420px] lg:h-[500px]"
            >
              <img
                src={banner.image_url}
                alt={banner.title ?? "Banner"}
                className="w-full h-full object-cover object-center"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                {banner.title && (
                  <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">
                    {banner.title}
                  </h2>
                )}
                {banner.description && (
                  <p className="text-white/90 text-sm md:text-lg mb-4 max-w-xl">
                    {banner.description}
                  </p>
                )}
                {banner.button_link && (
                  <Button asChild size="lg" className="rounded-xl shadow-lg h-12 px-8 font-semibold">
                    <a href={banner.button_link}>{banner.button_text ?? "Découvrir"}</a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Bannière précédente"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Bannière suivante"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Bannière ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === selectedIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
