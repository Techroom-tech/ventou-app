import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Check, Copy, Share2, ArrowRight, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import Confetti from '@/components/Confetti';

export default function ShopCreatedSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { shop, isLoading } = useShop();
  const [copied, setCopied] = useState(false);

  // Priority: slug from navigation state (immediate), fallback to cached shop
  const stateSlug = (location.state as any)?.slug;
  const slug = stateSlug || shop?.slug || '';
  const shopUrl = slug ? `${slug}.ventou.shop` : '';
  const fullUrl = slug ? `https://${shopUrl}` : '';

  // Debug: log to help diagnose
  console.log('[ShopCreatedSuccess] stateSlug:', stateSlug, 'shop?.slug:', shop?.slug, 'final slug:', slug);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({ title: t('shopCreated.copied') });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      toast({ title: t('shopCreated.copied') });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shop?.name || 'Ma boutique Ventou',
          url: fullUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${t('shopCreated.shareHint')} ${fullUrl}`)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Confetti duration={4000} />
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5 text-foreground" />
        </button>
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: 'hsl(var(--ventou-orange))' }}
        >
          {t('common.success')}
        </span>
        <div className="w-9" />
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-16">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Success icon */}
          <div className="relative flex justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-32 h-32 md:w-40 md:h-40">
                {[...Array(8)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-2 h-2 md:w-2.5 md:h-2.5 rounded-full animate-fade-in"
                    style={{
                      backgroundColor: 'hsl(var(--ventou-orange))',
                      opacity: 0.3 + (i % 3) * 0.2,
                      top: `${50 + 48 * Math.sin((i * Math.PI * 2) / 8)}%`,
                      left: `${50 + 48 * Math.cos((i * Math.PI * 2) / 8)}%`,
                      transform: 'translate(-50%, -50%)',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center animate-scale-in"
              style={{ backgroundColor: 'hsl(var(--ventou-orange))' }}
            >
              <Check className="h-12 w-12 md:h-14 md:w-14 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('shopCreated.title')}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {t('shopCreated.subtitle', { slug })}
            </p>
          </div>

          {/* Shop link card */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {t('shopCreated.linkLabel')}
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg border border-border p-3">
              <span className="flex-1 text-sm font-medium text-foreground truncate">
                {shopUrl}
              </span>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="shrink-0">
                {copied ? (
                  <Check className="h-4 w-4" style={{ color: 'hsl(var(--ventou-success))' }} />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('shopCreated.shareHint')}</p>
          </div>

          {/* View shop button */}
          {slug && (
            <Button
              variant="outline"
              onClick={() => navigate(`/shop/${slug}`)}
              className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
              size="lg"
            >
              <Eye className="h-5 w-5" />
              {t('shopCreated.viewShop')}
            </Button>
          )}

          {/* Add product CTA */}
          <Button
            onClick={() => navigate('/dashboard/products/new')}
            className="w-full h-12 text-base font-semibold gap-2 rounded-xl btn-ventou"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            {t('shopCreated.addProduct')}
          </Button>

          {/* Share row */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={handleShare} className="gap-2 rounded-xl flex-1 max-w-[160px]">
              <Share2 className="h-4 w-4" />
              {t('shopCreated.share')}
            </Button>
            <Button variant="outline" size="icon" onClick={shareWhatsApp} className="rounded-xl shrink-0" aria-label="WhatsApp">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="hsl(142, 76%, 36%)">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </Button>
            <Button variant="outline" size="icon" onClick={shareFacebook} className="rounded-xl shrink-0" aria-label="Facebook">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="hsl(220, 46%, 48%)">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </Button>
          </div>

          {/* Go to dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            {t('shopCreated.goToDashboard')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
