import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getPlatformUrl } from '@/lib/domain';
import { supabase } from '@/integrations/supabase/client';
import { Shop } from '@/types/shop';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { MapPin } from 'lucide-react';

interface PublishedPage {
  slug: string;
  title: string;
  page_type: string;
}

interface StoreFooterProps {
  shop: Shop;
  publishedPages?: PublishedPage[];
  basePath: string;
  navigate: (path: string) => void;
}

const NAV_TYPES = ['about', 'faq', 'contact', 'custom'];
const LEGAL_TYPES = ['legal', 'terms', 'privacy'];

/** Generate initials avatar */
function FooterAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

const DEFAULT_DISCLAIMER = 'Cette boutique est exploitée de manière indépendante et est responsable de ses propres contenus et produits.';

export default function StoreFooter({ shop, publishedPages = [], basePath, navigate }: StoreFooterProps) {
  const { t } = useTranslation();
  const primaryColor = shop.primary_color || '#1E3A5F';
  const currentYear = new Date().getFullYear();

  const { data: disclaimerText } = useQuery({
    queryKey: ['footer-disclaimer'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'footer_disclaimer')
        .maybeSingle();
      return typeof data?.value === 'string' ? data.value : DEFAULT_DISCLAIMER;
    },
    staleTime: 300_000,
  });

  const { navPages, legalPages } = useMemo(() => {
    const nav: PublishedPage[] = [];
    const legal: PublishedPage[] = [];
    for (const p of publishedPages) {
      if (LEGAL_TYPES.includes(p.page_type)) legal.push(p);
      else nav.push(p);
    }
    return { navPages: nav, legalPages: legal };
  }, [publishedPages]);

  const hasNav = navPages.length > 0;
  const hasLegal = legalPages.length > 0;
  const hasContact = !!(shop.whatsapp || shop.city || shop.country);

  const goToPage = (slug: string) => navigate(`${basePath}/page/${slug}`);

  return (
    <footer className="mt-auto border-t" style={{ backgroundColor: shop.footer_color ?? undefined }}>
      {/* Main grid */}
      <div className="max-w-[1200px] mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1 — Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {shop.logo_url ? (
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <FooterAvatar name={shop.name} color={primaryColor} />
              )}
              <span className="font-bold text-base">{shop.name}</span>
            </div>
            {shop.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">{shop.description}</p>
            )}
          </div>

          {/* Col 2 — Navigation */}
          {hasNav && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Navigation</h4>
              <ul className="space-y-2">
                {navPages.map(p => (
                  <li key={p.slug}>
                    <button
                      onClick={() => goToPage(p.slug)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 3 — Legal */}
          {hasLegal && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">{t('storefront.legal', 'Légal')}</h4>
              <ul className="space-y-2">
                {legalPages.map(p => (
                  <li key={p.slug}>
                    <button
                      onClick={() => goToPage(p.slug)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 4 — Contact */}
          {hasContact && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Contact</h4>
              <ul className="space-y-2">
                {shop.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <WhatsAppIcon size={14} />
                      {shop.whatsapp}
                    </a>
                  </li>
                )}
                {(shop.city || shop.country) && (
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[shop.city, shop.country].filter(Boolean).join(', ')}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border-t">
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            {disclaimerText ?? DEFAULT_DISCLAIMER}
          </p>
        </div>
      </div>

      {/* Copyright + Powered by */}
      <div className="border-t">
        <div className="max-w-[1200px] mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {shop.name} © {currentYear} {t('storefront.allRights', 'Tous droits réservés.')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('storefront.poweredBy', 'Propulsé par')}{' '}
            <a href={getPlatformUrl()} className="font-semibold hover:underline" style={{ color: primaryColor }}>
              Ventou
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
