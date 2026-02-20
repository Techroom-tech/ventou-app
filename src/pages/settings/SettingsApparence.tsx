import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Palette, Type, MousePointer2, Globe, Loader2,
  AlertCircle, Eye, EyeOff, Image, RefreshCw, LayoutGrid, Zap,
  ChevronDown, CheckCircle2, Monitor,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdvancedColorPicker } from '@/components/settings/AdvancedColorPicker';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AppearanceForm {
  logo_url: string;
  banner_url: string;
  favicon_url: string;
  banner_size: string;
  primary_color: string;
  secondary_color: string;
  button_color: string;
  button_text_color: string;
  badge_color: string;
  background_color: string;
  card_bg_color: string;
  header_color: string;
  footer_color: string;
  heading_font: string;
  body_font: string;
  title_size: number;
  body_size: number;
  letter_spacing: number;
  line_height: number;
  cta_label: string;
  button_radius: string;
  button_width: string;
  button_shadow: string;
  button_animation: string;
  dark_mode_enabled: boolean;
  product_card_style: string;
  global_radius: string;
  products_per_row: string;
  products_sort_order: string;
}

const DEFAULT_FORM: AppearanceForm = {
  logo_url: '',
  banner_url: '',
  favicon_url: '',
  banner_size: 'Medium',
  primary_color: '#1E3A5F',
  secondary_color: '#FF6B35',
  button_color: '#FF6B35',
  button_text_color: '#FFFFFF',
  badge_color: '#10B981',
  background_color: '#F9FAFB',
  card_bg_color: '#FFFFFF',
  header_color: '#1E3A5F',
  footer_color: '#1E3A5F',
  heading_font: 'Inter',
  body_font: 'Inter',
  title_size: 22,
  body_size: 14,
  letter_spacing: 0,
  line_height: 160,
  cta_label: 'Acheter maintenant',
  button_radius: 'Medium',
  button_width: 'Full width',
  button_shadow: 'None',
  button_animation: 'None',
  dark_mode_enabled: false,
  product_card_style: 'Soft shadow',
  global_radius: 'Medium',
  products_per_row: '3',
  products_sort_order: 'recent',
};

// ─── Constants ───────────────────────────────────────────────────────────────

const FONTS = ['Inter', 'Poppins', 'Manrope', 'Montserrat', 'Open Sans'];
const CTA_PRESETS = ['Acheter maintenant', 'Commander', 'Je commande', 'Ajouter au panier', 'Je le veux'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function PillGroup<T extends string>({
  options, value, onChange,
}: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-all',
            value === opt
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{children}</p>;
}

// ─── Color Row with Advanced Picker ──────────────────────────────────────────

function ColorRow({
  label, colorKey, form, update, defaultVal,
}: {
  label: string;
  colorKey: keyof AppearanceForm;
  form: AppearanceForm;
  update: (k: keyof AppearanceForm, v: string) => void;
  defaultVal: string;
}) {
  const [open, setOpen] = useState(false);
  const value = form[colorKey] as string;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-md border border-border/50 shrink-0 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="font-mono text-xs text-muted-foreground">{value.toUpperCase()}</p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="pl-1">
          <AdvancedColorPicker
            value={value}
            defaultValue={defaultVal}
            onChange={hex => update(colorKey, hex)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Font Card ───────────────────────────────────────────────────────────────

function FontCard({ font, selected, onSelect }: { font: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border p-3 gap-1 transition-all text-center hover:border-primary/50',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-background',
      )}
    >
      <span style={{ fontFamily: `${font}, sans-serif` }} className="text-xl font-bold text-foreground leading-none">Aa</span>
      <span className="text-[10px] text-muted-foreground">{font}</span>
    </button>
  );
}

// ─── Preview Component (memoized) ────────────────────────────────────────────

const StorefrontPreview = memo(function StorefrontPreview({
  form, shopName,
}: { form: AppearanceForm; shopName: string }) {
  const btnRadius = form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '10px';
  const cardRadius = form.global_radius === 'Sharp' ? '4px' : form.global_radius === 'Rounded' ? '16px' : '10px';
  const cardShadow = form.product_card_style === 'Soft shadow' ? '0 4px 16px rgba(0,0,0,0.08)' : 'none';
  const cardBorder = form.product_card_style === 'Border minimal' ? `1px solid rgba(0,0,0,0.1)` : 'none';
  const bannerH = form.banner_size === 'Small' ? 40 : form.banner_size === 'Large' ? 80 : 56;
  const initials = shopName.slice(0, 2).toUpperCase() || 'SH';
  const bg = form.dark_mode_enabled ? '#111827' : form.background_color || '#F9FAFB';
  const fg = form.dark_mode_enabled ? '#f9fafb' : '#111827';
  const cardBg = form.dark_mode_enabled ? '#1f2937' : form.card_bg_color || '#FFFFFF';
  const mutedFg = form.dark_mode_enabled ? '#9ca3af' : '#6b7280';
  const headerBg = form.header_color || form.primary_color;
  const footerBg = form.footer_color || '#1E3A5F';
  const btnShadow = form.button_shadow === 'Soft' ? '0 2px 8px rgba(0,0,0,0.15)' : form.button_shadow === 'Elevated' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none';

  return (
    <div
      style={{
        background: bg, color: fg,
        fontFamily: form.body_font + ', sans-serif',
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)', fontSize: 12,
      }}
    >
      {/* Header */}
      <div style={{ background: headerBg, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {form.logo_url ? (
            <img src={form.logo_url} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: 'contain', background: '#fff' }} onError={e => (e.currentTarget.style.display = 'none')} />
          ) : (
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 9 }}>{initials}</div>
          )}
          <span style={{ fontFamily: form.heading_font + ', sans-serif', fontWeight: 700, color: '#fff', fontSize: 12, letterSpacing: form.letter_spacing + 'px' }}>{shopName || 'Ma Boutique'}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Produits', 'À propos'].map(l => (
            <span key={l} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div style={{ height: bannerH, background: `linear-gradient(135deg, ${form.secondary_color || form.primary_color}, ${form.primary_color})`, position: 'relative', overflow: 'hidden' }}>
        {form.banner_url && (
          <img src={form.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontFamily: form.heading_font + ', sans-serif', fontWeight: 700, fontSize: 13, opacity: form.banner_url ? 0 : 0.8, letterSpacing: form.letter_spacing + 'px' }}>Découvrez nos produits</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          <span style={{ background: form.badge_color, color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>-10%</span>
          <span style={{ color: mutedFg, fontSize: 9 }}>Promo du moment</span>
        </div>

        {/* Product grid */}
        <div style={{ display: 'grid', gridTemplateColumns: form.products_per_row === '1' ? '1fr' : form.products_per_row === '2' ? '1fr 1fr' : '1fr 1fr 1fr', gap: 6 }}>
          {[{ name: 'Produit vedette', price: '5 000 FCFA', oldPrice: '6 000' }, { name: 'Autre produit', price: '3 500 FCFA', oldPrice: null }].slice(0, form.products_per_row === '1' ? 1 : 2).map((p, i) => (
            <div key={i} style={{ background: cardBg, borderRadius: cardRadius, boxShadow: cardShadow, border: cardBorder, overflow: 'hidden' }}>
              <div style={{ height: 46, background: `linear-gradient(135deg, ${form.primary_color}22, ${form.button_color}33)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18 }}>📦</span>
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontFamily: form.heading_font + ', sans-serif', fontWeight: 600, fontSize: 10, color: fg, marginBottom: 2, letterSpacing: form.letter_spacing + 'px' }}>{p.name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {p.oldPrice && <span style={{ textDecoration: 'line-through', color: mutedFg, fontSize: 8 }}>{p.oldPrice} FCFA</span>}
                  <span style={{ fontWeight: 700, color: form.primary_color, fontSize: 10, lineHeight: form.line_height / 100 }}>{p.price}</span>
                  <button style={{
                    background: form.button_color, color: form.button_text_color,
                    borderRadius: btnRadius, padding: '3px 0', fontSize: 8, fontWeight: 600,
                    border: 'none', cursor: 'default', width: form.button_width === 'Full width' ? '100%' : 'auto',
                    boxShadow: btnShadow, letterSpacing: form.letter_spacing + 'px',
                  }}>
                    {form.cta_label.slice(0, 16)}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: footerBg, padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontFamily: form.body_font + ', sans-serif' }}>© {shopName || 'Ma Boutique'}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>Ventou</span>
      </div>
    </div>
  );
});

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SettingsApparence() {
  const navigate = useNavigate();
  const { shop, isLoading } = useShop();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [customCta, setCustomCta] = useState('');
  const [isCustomCta, setIsCustomCta] = useState(false);
  const [form, setForm] = useState<AppearanceForm>(DEFAULT_FORM);
  const [iframeKey, setIframeKey] = useState(0);

  const savedFormRef = useRef<AppearanceForm>(DEFAULT_FORM);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedFormRef.current);

  // Initialize form from shop data
  useEffect(() => {
    if (!shop) return;
    const f: AppearanceForm = {
      logo_url: shop.logo_url ?? '',
      banner_url: shop.banner_url ?? '',
      favicon_url: shop.favicon_url ?? '',
      banner_size: shop.banner_size ?? 'Medium',
      primary_color: shop.primary_color ?? '#1E3A5F',
      secondary_color: shop.secondary_color ?? '#FF6B35',
      button_color: shop.button_color ?? '#FF6B35',
      button_text_color: shop.button_text_color ?? '#FFFFFF',
      badge_color: shop.badge_color ?? '#10B981',
      background_color: shop.background_color ?? '#F9FAFB',
      card_bg_color: shop.card_bg_color ?? '#FFFFFF',
      header_color: shop.header_color ?? shop.primary_color ?? '#1E3A5F',
      footer_color: shop.footer_color ?? '#1E3A5F',
      heading_font: shop.heading_font ?? 'Inter',
      body_font: shop.body_font ?? 'Inter',
      title_size: 22,
      body_size: 14,
      letter_spacing: 0,
      line_height: 160,
      cta_label: shop.cta_label ?? 'Acheter maintenant',
      button_radius: shop.button_radius ?? 'Medium',
      button_width: shop.button_width ?? 'Full width',
      button_shadow: shop.button_shadow ?? 'None',
      button_animation: shop.button_animation ?? 'None',
      dark_mode_enabled: shop.dark_mode_enabled ?? false,
      product_card_style: shop.product_card_style ?? 'Soft shadow',
      global_radius: shop.global_radius ?? 'Medium',
      products_per_row: shop.products_per_row ?? '3',
      products_sort_order: shop.products_sort_order ?? 'recent',
    };
    setForm(f);
    savedFormRef.current = f;
    const existingCta = shop.cta_label ?? 'Acheter maintenant';
    if (!CTA_PRESETS.includes(existingCta)) {
      setIsCustomCta(true);
      setCustomCta(existingCta);
    }
  }, [shop]);

  // Load Google Fonts dynamically
  useEffect(() => {
    const fonts = [...new Set([form.heading_font, form.body_font])].filter(f => f !== 'Inter');
    fonts.forEach(font => {
      const id = `gf-${font.replace(/\s+/g, '-')}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    });
  }, [form.heading_font, form.body_font]);

  const update = useCallback(<K extends keyof AppearanceForm>(key: K, value: AppearanceForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    const f = { ...DEFAULT_FORM, logo_url: form.logo_url, banner_url: form.banner_url, favicon_url: form.favicon_url };
    setForm(f);
    toast.info('Thème réinitialisé aux valeurs par défaut');
  }, [form.logo_url, form.banner_url, form.favicon_url]);

  const handleSave = async () => {
    if (!shop || saving) return;
    setSaving(true);
    try {
      const payload = {
        logo_url: form.logo_url || null,
        banner_url: form.banner_url || null,
        favicon_url: form.favicon_url || null,
        banner_size: form.banner_size,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        button_color: form.button_color,
        button_text_color: form.button_text_color,
        badge_color: form.badge_color,
        background_color: form.background_color,
        card_bg_color: form.card_bg_color,
        header_color: form.header_color,
        footer_color: form.footer_color,
        heading_font: form.heading_font,
        body_font: form.body_font,
        cta_label: form.cta_label,
        button_radius: form.button_radius,
        button_width: form.button_width,
        button_shadow: form.button_shadow,
        button_animation: form.button_animation,
        dark_mode_enabled: form.dark_mode_enabled,
        product_card_style: form.product_card_style,
        global_radius: form.global_radius,
        products_per_row: form.products_per_row,
        products_sort_order: form.products_sort_order,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('shops').update(payload).eq('id', shop.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['shop'] });
      savedFormRef.current = { ...form };
      setIframeKey(k => k + 1);
      toast.success('Apparence sauvegardée ! ✨');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── Color defaults map ──
  const COLOR_DEFAULTS: Partial<Record<keyof AppearanceForm, string>> = {
    primary_color: '#1E3A5F',
    secondary_color: '#FF6B35',
    button_color: '#FF6B35',
    button_text_color: '#FFFFFF',
    badge_color: '#10B981',
    background_color: '#F9FAFB',
    card_bg_color: '#FFFFFF',
    header_color: '#1E3A5F',
    footer_color: '#1E3A5F',
  };

  const storeFrontUrl = shop?.slug ? `/boutique/${shop.slug}?preview=true` : null;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border mb-5 -mx-4 px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => navigate('/dashboard/parametres')}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-semibold text-foreground">Apparence</h1>
                  {isDirty && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-3 w-3" />
                      Modifications non enregistrées
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">Personnalisez l'identité visuelle de votre boutique</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Réinitialiser
              </button>
              <button
                onClick={() => setShowPreviewMobile(p => !p)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors lg:hidden"
              >
                {showPreviewMobile ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreviewMobile ? 'Masquer' : 'Aperçu'}
              </button>
              <Button
                onClick={handleSave}
                disabled={saving || isLoading}
                className="btn-ventou h-8 px-4 text-sm font-medium gap-1.5"
              >
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sauvegarde...</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" />Enregistrer</>}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Mobile Preview ── */}
        {showPreviewMobile && (
          <div className="lg:hidden mb-4 rounded-xl overflow-hidden border border-border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Eye className="h-3 w-3" />Aperçu en direct
            </p>
            <StorefrontPreview form={form} shopName={shop?.name ?? 'Ma Boutique'} />
          </div>
        )}

        {/* ── 2-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">

          {/* ════════════════════════════════════════
              LEFT COLUMN — Settings Accordion
          ════════════════════════════════════════ */}
          <div className="min-w-0">
            <Accordion type="multiple" defaultValue={['identity', 'colors', 'typography', 'cta', 'global']} className="space-y-2">

              {/* ── 1. Identité visuelle ── */}
              <AccordionItem value="identity" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Identité visuelle
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pb-1">
                    {/* Logo */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Logo (URL)</Label>
                      <div className="flex gap-2 items-center">
                        {form.logo_url && (
                          <div className="w-10 h-10 rounded-lg border border-border overflow-hidden shrink-0 bg-muted">
                            <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                        <Input value={form.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="https://…/logo.png" className="h-9 text-sm" />
                      </div>
                    </div>

                    {/* Banner */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Bannière (URL)</Label>
                      {form.banner_url && (
                        <div className="w-full h-16 rounded-lg border border-border overflow-hidden bg-muted">
                          <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}
                      <Input value={form.banner_url} onChange={e => update('banner_url', e.target.value)} placeholder="https://…/banner.jpg" className="h-9 text-sm" />
                      <div className="space-y-1">
                        <SectionLabel>Taille bannière</SectionLabel>
                        <PillGroup options={['Small', 'Medium', 'Large'] as const} value={form.banner_size as 'Small' | 'Medium' | 'Large'} onChange={v => update('banner_size', v)} />
                      </div>
                    </div>

                    {/* Favicon */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Favicon (URL)</Label>
                      <div className="flex gap-2 items-center">
                        {form.favicon_url && (
                          <div className="w-8 h-8 rounded border border-border shrink-0 bg-muted overflow-hidden">
                            <img src={form.favicon_url} alt="Favicon" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                        <Input value={form.favicon_url} onChange={e => update('favicon_url', e.target.value)} placeholder="https://…/favicon.ico" className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 2. Couleurs ── */}
              <AccordionItem value="colors" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Couleurs
                    <div className="flex gap-1 ml-2">
                      {['primary_color', 'button_color', 'badge_color'].map(k => (
                        <div key={k} className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: form[k as keyof AppearanceForm] as string }} />
                      ))}
                    </div>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-1">
                    <ColorRow label="Couleur principale" colorKey="primary_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.primary_color!} />
                    <ColorRow label="Couleur secondaire" colorKey="secondary_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.secondary_color!} />
                    <ColorRow label="Fond bouton CTA" colorKey="button_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.button_color!} />
                    <ColorRow label="Texte bouton CTA" colorKey="button_text_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.button_text_color!} />
                    <ColorRow label="Badge promo" colorKey="badge_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.badge_color!} />
                    <ColorRow label="Fond global" colorKey="background_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.background_color!} />
                    <ColorRow label="Fond cartes produit" colorKey="card_bg_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.card_bg_color!} />
                    <ColorRow label="Couleur header" colorKey="header_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.header_color!} />
                    <ColorRow label="Couleur footer" colorKey="footer_color" form={form} update={update} defaultVal={COLOR_DEFAULTS.footer_color!} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 3. Typographie ── */}
              <AccordionItem value="typography" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    Typographie
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pb-1">
                    {/* Heading font */}
                    <div className="space-y-2">
                      <SectionLabel>Police des titres</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {FONTS.map(f => (
                          <FontCard key={f} font={f} selected={form.heading_font === f} onSelect={() => update('heading_font', f)} />
                        ))}
                      </div>
                    </div>

                    {/* Body font */}
                    <div className="space-y-2">
                      <SectionLabel>Police du texte</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {FONTS.map(f => (
                          <FontCard key={f} font={f} selected={form.body_font === f} onSelect={() => update('body_font', f)} />
                        ))}
                      </div>
                    </div>

                    {/* Sliders */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <SectionLabel>Taille titres — {form.title_size}px</SectionLabel>
                        <Slider min={14} max={40} step={1} value={[form.title_size]} onValueChange={([v]) => update('title_size', v)} />
                      </div>
                      <div className="space-y-2">
                        <SectionLabel>Taille texte — {form.body_size}px</SectionLabel>
                        <Slider min={10} max={20} step={1} value={[form.body_size]} onValueChange={([v]) => update('body_size', v)} />
                      </div>
                      <div className="space-y-2">
                        <SectionLabel>Espacement lettres — {form.letter_spacing}px</SectionLabel>
                        <Slider min={-1} max={4} step={0.1} value={[form.letter_spacing]} onValueChange={([v]) => update('letter_spacing', v)} />
                      </div>
                      <div className="space-y-2">
                        <SectionLabel>Hauteur de ligne — {form.line_height}%</SectionLabel>
                        <Slider min={120} max={200} step={5} value={[form.line_height]} onValueChange={([v]) => update('line_height', v)} />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 4. Bouton CTA ── */}
              <AccordionItem value="cta" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    Bouton CTA
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pb-1">
                    {/* CTA Labels */}
                    <div className="space-y-2">
                      <SectionLabel>Texte du bouton</SectionLabel>
                      <div className="flex flex-wrap gap-1.5">
                        {CTA_PRESETS.map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => { update('cta_label', preset); setIsCustomCta(false); }}
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                              form.cta_label === preset && !isCustomCta
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCustomCta(true)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                            isCustomCta ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                          )}
                        >
                          Personnalisé
                        </button>
                      </div>
                      {isCustomCta && (
                        <Input
                          value={customCta}
                          onChange={e => { setCustomCta(e.target.value.slice(0, 25)); update('cta_label', e.target.value.slice(0, 25)); }}
                          placeholder="Texte personnalisé (max 25 car.)"
                          className="h-9 text-sm mt-1"
                          maxLength={25}
                        />
                      )}
                    </div>

                    {/* Radius */}
                    <div className="space-y-2">
                      <SectionLabel>Arrondi</SectionLabel>
                      <PillGroup options={['Sharp', 'Medium', 'Pill'] as const} value={form.button_radius as 'Sharp' | 'Medium' | 'Pill'} onChange={v => update('button_radius', v)} />
                    </div>

                    {/* Width */}
                    <div className="space-y-2">
                      <SectionLabel>Largeur</SectionLabel>
                      <PillGroup options={['Full width', 'Fit content'] as const} value={form.button_width as 'Full width' | 'Fit content'} onChange={v => update('button_width', v)} />
                    </div>

                    {/* Shadow */}
                    <div className="space-y-2">
                      <SectionLabel>Ombre</SectionLabel>
                      <PillGroup options={['None', 'Soft', 'Elevated'] as const} value={form.button_shadow as 'None' | 'Soft' | 'Elevated'} onChange={v => update('button_shadow', v)} />
                    </div>

                    {/* Animation */}
                    <div className="space-y-2">
                      <SectionLabel>Animation</SectionLabel>
                      <PillGroup options={['None', 'Bounce', 'Pulse', 'Shake', 'Shine'] as const} value={form.button_animation as 'None' | 'Bounce' | 'Pulse' | 'Shake' | 'Shine'} onChange={v => update('button_animation', v)} />
                    </div>

                    {/* Live button preview */}
                    <div className="space-y-2">
                      <SectionLabel>Aperçu bouton</SectionLabel>
                      <div className="flex justify-center py-3 bg-muted/30 rounded-lg">
                        <button
                          type="button"
                          style={{
                            background: form.button_color,
                            color: form.button_text_color,
                            borderRadius: form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '10px',
                            padding: '8px 20px',
                            fontSize: 13,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'default',
                            width: form.button_width === 'Full width' ? '100%' : 'auto',
                            boxShadow: form.button_shadow === 'Soft' ? '0 2px 8px rgba(0,0,0,0.15)' : form.button_shadow === 'Elevated' ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
                            letterSpacing: form.letter_spacing + 'px',
                            fontFamily: form.body_font + ', sans-serif',
                          }}
                        >
                          {form.cta_label}
                        </button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── 5. Style global ── */}
              <AccordionItem value="global" className="rounded-xl border border-border bg-card px-4 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-4">
                  <span className="flex items-center gap-2 font-semibold text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Style global
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5 pb-1">
                    {/* Dark mode */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Mode sombre</p>
                          <p className="text-xs text-muted-foreground">Interface adaptée à l'obscurité</p>
                        </div>
                      </div>
                      <Switch checked={form.dark_mode_enabled} onCheckedChange={v => update('dark_mode_enabled', v)} />
                    </div>

                    {/* Card style */}
                    <div className="space-y-2">
                      <SectionLabel>Style des cartes produit</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Soft shadow', 'Border minimal', 'Flat'] as const).map(style => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => update('product_card_style', style)}
                            className={cn(
                              'rounded-xl border p-3 text-center transition-all space-y-1',
                              form.product_card_style === style
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border hover:border-primary/50 bg-background',
                            )}
                          >
                            <div className={cn(
                              'w-full h-8 rounded',
                              style === 'Soft shadow' ? 'shadow-md' : '',
                              style === 'Border minimal' ? 'border border-border' : '',
                              style === 'Flat' ? 'bg-muted' : 'bg-card',
                            )} />
                            <p className="text-[10px] text-muted-foreground leading-tight">{style}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Global radius */}
                    <div className="space-y-2">
                      <SectionLabel>Rayon global des bordures</SectionLabel>
                      <PillGroup options={['Sharp', 'Medium', 'Rounded'] as const} value={form.global_radius as 'Sharp' | 'Medium' | 'Rounded'} onChange={v => update('global_radius', v)} />
                    </div>

                    {/* Products per row */}
                    <div className="space-y-2">
                      <SectionLabel>Produits par ligne</SectionLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {(['1', '2', '3'] as const).map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => update('products_per_row', n)}
                            className={cn(
                              'rounded-xl border p-3 flex flex-col items-center gap-1 transition-all',
                              form.products_per_row === n
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border hover:border-primary/50 bg-background',
                            )}
                          >
                            <div className="flex gap-0.5">
                              {Array.from({ length: Number(n) }).map((_, i) => (
                                <div key={i} className="h-5 bg-muted rounded" style={{ width: n === '1' ? 32 : n === '2' ? 14 : 9 }} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{n} par ligne</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sort order */}
                    <div className="space-y-2">
                      <SectionLabel>Ordre d'affichage</SectionLabel>
                      <Select value={form.products_sort_order} onValueChange={v => update('products_sort_order', v)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Plus récent</SelectItem>
                          <SelectItem value="alpha">Alphabétique</SelectItem>
                          <SelectItem value="best_seller">Plus vendu</SelectItem>
                          <SelectItem value="price_asc">Moins cher</SelectItem>
                          <SelectItem value="price_desc">Plus cher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

            </Accordion>

            {/* Mobile save bar */}
            <div className="lg:hidden sticky bottom-4 mt-4">
              <Button onClick={handleSave} disabled={saving} className="btn-ventou w-full h-11 text-sm font-medium gap-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Sauvegarde...</> : 'Enregistrer les modifications'}
              </Button>
            </div>
          </div>

          {/* ════════════════════════════════════════
              RIGHT COLUMN — Preview Panel
          ════════════════════════════════════════ */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              {/* ── Mock Preview ── */}
              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Aperçu en direct</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isDirty && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
                        <span className="text-[10px] text-amber-500 ml-1">Non sauvegardé</span>
                      </>
                    )}
                    {!isDirty && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[10px] text-green-600 ml-1">Synchronisé</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <StorefrontPreview form={form} shopName={shop?.name ?? 'Ma Boutique'} />
                </div>
              </div>

              {/* ── Real Iframe ── */}
              {storeFrontUrl && (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">Boutique réelle</span>
                      <span className="text-[10px] text-muted-foreground">— après sauvegarde</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIframeKey(k => k + 1)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-0.5 hover:bg-muted"
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      Actualiser
                    </button>
                  </div>
                  <div className="relative" style={{ height: 420 }}>
                    <iframe
                      key={iframeKey}
                      src={storeFrontUrl}
                      title="Aperçu boutique réelle"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
