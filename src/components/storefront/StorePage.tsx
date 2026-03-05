import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import TipTapRenderer from '@/components/storefront/TipTapRenderer';
import { replaceTags } from '@/hooks/useStorePages';
import type { Shop } from '@/types/shop';

interface StorePageProps {
  shop: Shop;
  pageSlug: string;
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
}

export default function StorePage({ shop, pageSlug, onBack }: StorePageProps) {
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

  const content = page.content as Record<string, unknown> | null;
  const isFAQ = !!(content && (content as any).faq_items);

  // Replace dynamic tags in FAQ answers
  const replaceTagsInString = (s: string): string => {
    const now = new Date();
    const tagMap: Record<string, string> = {
      '{{storeName}}': shop.name ?? '',
      '{{storeUrl}}': shop.slug ? `${shop.slug}.ventou.shop` : '',
      '{{storePhone}}': shop.whatsapp ?? '',
      '{{storeCity}}': shop.city ?? '',
      '{{storeCountry}}': shop.country ?? '',
      '{{storeCurrency}}': shop.currency ?? 'XOF',
      '{{storeWhatsApp}}': shop.whatsapp ?? '',
      '{{currentYear}}': String(now.getFullYear()),
      '{{storeDescription}}': shop.description ?? '',
    };
    let result = s;
    for (const [tag, value] of Object.entries(tagMap)) {
      result = result.split(tag).join(value);
    }
    return result;
  };

  if (isFAQ) {
    const faqItems = ((content as any).faq_items as FAQItem[]).filter(
      (f) => f.question.trim() && f.answer.trim()
    );

    return (
      <div className="flex-1">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8 md:py-12">
          <Button variant="ghost" size="sm" className="mb-6" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">Questions Fréquentes</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Trouvez rapidement les réponses à vos questions.
          </p>

          <Accordion type="single" collapsible className="space-y-2">
            {faqItems.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border rounded-xl px-4 data-[state=open]:bg-accent/30 transition-colors"
              >
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">
                  {replaceTagsInString(item.question)}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {replaceTagsInString(item.answer)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    );
  }

  // Regular page with TipTap content
  const renderedContent = content
    ? replaceTags(content, {
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
