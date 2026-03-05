import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import TipTapRenderer from '@/components/storefront/TipTapRenderer';
import { replaceTags } from '@/hooks/useStorePages';
import type { Shop } from '@/types/shop';

interface StorePageProps {
  shop: Shop;
  pageSlug: string;
  onBack: () => void;
}

export default function StorePage({ shop, pageSlug, onBack }: StorePageProps) {
  const { t } = useTranslation();

  const { data: page, isLoading } = useQuery({
    queryKey: ['storefront-page', shop.id, pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_pages')
        .select('*')
        .eq('shop_id', shop.id)
        .eq('slug', pageSlug)
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Cette page n'existe pas ou n'est pas publiée.</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la boutique
        </Button>
      </div>
    );
  }

  // Replace dynamic tags
  const renderedContent = page.content
    ? replaceTags(page.content as Record<string, unknown>, {
        name: shop.name,
        slug: shop.slug,
        city: shop.city ?? undefined,
        country: shop.country ?? undefined,
        whatsapp: shop.whatsapp ?? undefined,
        currency: shop.currency,
        category: shop.category ?? undefined,
        description: shop.description ?? undefined,
      })
    : null;

  return (
    <div className="flex-1">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <Button variant="ghost" size="sm" className="mb-6" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <article className="prose prose-sm md:prose-base max-w-none">
          <TipTapRenderer content={renderedContent} />
        </article>
      </div>
    </div>
  );
}
