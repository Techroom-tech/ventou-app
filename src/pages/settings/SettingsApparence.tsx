import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Palette, Type, MousePointer2, Globe, Loader2,
  CheckCircle2, Eye, EyeOff, Image, Layers, Zap, Sun, Moon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useShop } from '@/hooks/useShop';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  heading_font: string;
  body_font: string;
  title_size: string;
  spacing_density: string;
  cta_label: string;
  button_radius: string;
  button_width: string;
  button_animation: string;
  dark_mode_enabled: boolean;
  product_card_style: string;
  global_radius: string;
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
  heading_font: 'Inter',
  body_font: 'Inter',
  title_size: 'Normal',
  spacing_density: 'Comfortable',
  cta_label: 'Acheter maintenant',
  button_radius: 'Medium',
  button_width: 'Full width',
  button_animation: 'None',
  dark_mode_enabled: false,
  product_card_style: 'Soft shadow',
  global_radius: 'Medium',
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#1E3A5F', '#FF6B35', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#84CC16',
];
const FONTS = ['Inter', 'Poppins', 'Manrope', 'Montserrat', 'Open Sans'];
const CTA_PRESETS = ['Acheter maintenant', 'Commander', 'Je commande', 'Ajouter au panier', 'Obtenir maintenant'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function PillGroup<T extends string>({
  options, value, onChange, size = 'sm',
}: { options: T[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'xs' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full border transition-all font-medium',
            size === 'xs' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs',
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

function ColorRow({
  label, colorKey, form, update,
}: { label: string; colorKey: keyof AppearanceForm; form: AppearanceForm; update: (k: keyof AppearanceForm, v: string) => void }) {
  const value = form[colorKey] as string;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">{value}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => update(colorKey, c)}
            style={{ backgroundColor: c }}
            className={cn(
              'w-6 h-6 rounded-full border-2 transition-all shrink-0',
              value === c ? 'border-foreground scale-110 shadow-md' : 'border-transparent',
            )}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={e => update(colorKey, e.target.value)}
          className="w-6 h-6 rounded-full border border-border cursor-pointer shrink-0 overflow-hidden"
          title="Couleur personnalisée"
        />
      </div>
    </div>
  );
}

// ─── Preview Component (memoized) ────────────────────────────────────────────

const StorefrontPreview = memo(function StorefrontPreview({
  form, shopName,
}: { form: AppearanceForm; shopName: string }) {
  const bannerHeight = form.banner_size === 'Small' ? 48 : form.banner_size === 'Large' ? 96 : 64;
  const btnRadius = form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '8px';
  const cardRadius = form.global_radius === 'Sharp' ? '4px' : form.global_radius === 'Rounded' ? '16px' : '8px';
  const cardShadow = form.product_card_style === 'Soft shadow'
    ? '0 4px 12px rgba(0,0,0,0.08)'
    : form.product_card_style === 'Border minimal'
    ? 'none'
    : 'none';
  const cardBorder = form.product_card_style === 'Border minimal'
    ? '1px solid #e5e7eb'
    : form.product_card_style === 'Flat'
    ? 'none'
    : 'none';
  const bg = form.dark_mode_enabled ? '#111827' : '#f9fafb';
  const fg = form.dark_mode_enabled ? '#f9fafb' : '#111827';
  const cardBg = form.dark_mode_enabled ? '#1f2937' : '#ffffff';
  const mutedColor = form.dark_mode_enabled ? '#9ca3af' : '#6b7280';
  const initials = shopName.slice(0, 2).toUpperCase() || 'SH';
  const ctaWidth = form.button_width === 'Full width' ? '100%' : 'auto';

  return (
    <div
      style={{
        background: bg,
        color: fg,
        fontFamily: form.body_font + ', sans-serif',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        fontSize: '12px',
      }}
    >
      {/* Header */}
      <div style={{ background: form.primary_color, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {form.logo_url ? (
          <img src={form.logo_url} alt="logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: '#fff' }} onError={e => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 10 }}>{initials}</div>
        )}
        <span style={{ fontFamily: form.heading_font + ', sans-serif', fontWeight: 700, color: '#fff', fontSize: 13 }}>{shopName || 'Ma Boutique'}</span>
      </div>

      {/* Banner */}
      <div style={{ height: bannerHeight, background: form.secondary_color || form.primary_color, opacity: 0.3, position: 'relative' }}>
        {form.banner_url && (
          <img src={form.banner_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} onError={e => (e.currentTarget.style.display = 'none')} />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ background: form.badge_color, color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>-10%</span>
          <span style={{ color: mutedColor, fontSize: 9 }}>Promo du moment</span>
        </div>

        {/* Product card */}
        <div style={{ background: cardBg, borderRadius: cardRadius, boxShadow: cardShadow, border: cardBorder, overflow: 'hidden' }}>
          <div style={{ height: 64, background: `linear-gradient(135deg, ${form.primary_color}22, ${form.secondary_color || form.button_color}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 24 }}>📦</span>
          </div>
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontFamily: form.heading_font + ', sans-serif', fontWeight: 600, color: fg, marginBottom: 2, fontSize: 11 }}>Nom du produit</div>
            <div style={{ color: mutedColor, fontSize: 9, marginBottom: 6 }}>Description courte</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div>
                <div style={{ fontWeight: 700, color: form.primary_color, fontSize: 12 }}>5 000 FCFA</div>
                <div style={{ textDecoration: 'line-through', color: mutedColor, fontSize: 9 }}>6 000 FCFA</div>
              </div>
              <button
                style={{
                  background: form.button_color,
                  color: form.button_text_color,
                  borderRadius: btnRadius,
                  padding: '4px 8px',
                  fontSize: 9,
                  fontWeight: 600,
                  border: 'none',
                  width: ctaWidth,
                  cursor: 'default',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 90,
                }}
              >
                {form.cta_label}
              </button>
            </div>
          </div>
        </div>

        {/* Second card (faded) */}
        <div style={{ background: cardBg, borderRadius: cardRadius, boxShadow: cardShadow, border: cardBorder, opacity: 0.5, height: 40, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 4, background: `${form.primary_color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛍️</div>
          <div style={{ flex: 1 }}>
            <div style={{ width: 60, height: 7, background: fg, borderRadius: 4, opacity: 0.15, marginBottom: 3 }} />
            <div style={{ width: 40, height: 6, background: fg, borderRadius: 4, opacity: 0.1 }} />
          </div>
        </div>
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
  const [saved, setSaved] = useState(false);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);
  const [customCta, setCustomCta] = useState('');
  const [isCustomCta, setIsCustomCta] = useState(false);
  const [form, setForm] = useState<AppearanceForm>(DEFAULT_FORM);

  // Initialize form from shop data
  useEffect(() => {
    if (!shop) return;
    setForm({
      logo_url: shop.logo_url ?? '',
      banner_url: shop.banner_url ?? '',
      favicon_url: shop.favicon_url ?? '',
      banner_size: shop.banner_size ?? 'Medium',
      primary_color: shop.primary_color ?? '#1E3A5F',
      secondary_color: shop.secondary_color ?? '#FF6B35',
      button_color: shop.button_color ?? '#FF6B35',
      button_text_color: shop.button_text_color ?? '#FFFFFF',
      badge_color: shop.badge_color ?? '#10B981',
      heading_font: shop.heading_font ?? 'Inter',
      body_font: shop.body_font ?? 'Inter',
      title_size: shop.title_size ?? 'Normal',
      spacing_density: shop.spacing_density ?? 'Comfortable',
      cta_label: shop.cta_label ?? 'Acheter maintenant',
      button_radius: shop.button_radius ?? 'Medium',
      button_width: shop.button_width ?? 'Full width',
      button_animation: shop.button_animation ?? 'None',
      dark_mode_enabled: shop.dark_mode_enabled ?? false,
      product_card_style: shop.product_card_style ?? 'Soft shadow',
      global_radius: shop.global_radius ?? 'Medium',
    });
    // Check if existing CTA is a preset
    const existingCta = shop.cta_label ?? 'Acheter maintenant';
    if (!CTA_PRESETS.includes(existingCta)) {
      setIsCustomCta(true);
      setCustomCta(existingCta);
    }
  }, [shop]);

  // Load Google Fonts dynamically
  useEffect(() => {
    const fonts = [form.heading_font, form.body_font].filter(f => f !== 'Inter');
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

  const handleSave = async () => {
    if (!shop || saving) return;
    setSaving(true);
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      const { error } = await supabase.from('shops').update(payload).eq('id', shop.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['shop'] });
      setSaved(true);
      toast.success('Apparence sauvegardée !');
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const SaveButton = (
    <Button
      onClick={handleSave}
      disabled={saving || isLoading}
      className="btn-ventou h-9 px-5 text-sm font-medium gap-2 shrink-0"
    >
      {saving
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sauvegarde...</>
        : saved
        ? <><CheckCircle2 className="h-3.5 w-3.5" />Sauvegardé</>
        : 'Enregistrer les modifications'}
    </Button>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/parametres')}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground leading-tight">Apparence</h1>
              <p className="text-sm text-muted-foreground">Personnalisez l'identité visuelle de votre boutique</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreviewMobile(p => !p)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors lg:hidden"
            >
              {showPreviewMobile ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreviewMobile ? 'Masquer' : 'Voir aperçu'}
            </button>
            {SaveButton}
          </div>
        </div>

        {/* Mobile preview toggle */}
        {showPreviewMobile && (
          <div className="lg:hidden">
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Eye className="h-3 w-3" />Aperçu en direct</p>
              <StorefrontPreview form={form} shopName={shop?.name ?? 'Ma Boutique'} />
            </div>
          </div>
        )}

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
          {/* ── LEFT: Settings ── */}
          <div className="space-y-4">
            {/* Section 1: Identité visuelle */}
            <SectionCard icon={<Image className="h-4 w-4" />} title="Identité visuelle">
              <div className="grid gap-3">
                <Label className="text-xs font-medium">URL du logo</Label>
                <Input
                  value={form.logo_url}
                  onChange={e => update('logo_url', e.target.value)}
                  placeholder="https://exemple.com/logo.png"
                  className="h-9 text-sm"
                />
                {form.logo_url && (
                  <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded-lg border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>

              <div className="grid gap-3">
                <Label className="text-xs font-medium">URL de la bannière</Label>
                <Input
                  value={form.banner_url}
                  onChange={e => update('banner_url', e.target.value)}
                  placeholder="https://exemple.com/banniere.jpg"
                  className="h-9 text-sm"
                />
                {form.banner_url && (
                  <img
                    src={form.banner_url}
                    alt="Bannière"
                    className={cn(
                      'w-full object-cover rounded-lg border border-border',
                      form.banner_size === 'Small' ? 'h-16' : form.banner_size === 'Large' ? 'h-32' : 'h-24',
                    )}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Taille&nbsp;:</Label>
                  <PillGroup options={['Small', 'Medium', 'Large'] as const} value={form.banner_size as 'Small' | 'Medium' | 'Large'} onChange={v => update('banner_size', v)} size="xs" />
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-xs font-medium">URL du favicon</Label>
                <div className="flex items-center gap-3">
                  <Input
                    value={form.favicon_url}
                    onChange={e => update('favicon_url', e.target.value)}
                    placeholder="https://exemple.com/favicon.ico"
                    className="h-9 text-sm"
                  />
                  {form.favicon_url && (
                    <img src={form.favicon_url} alt="Favicon" className="h-8 w-8 object-contain rounded border border-border shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Couleurs */}
            <SectionCard icon={<Palette className="h-4 w-4" />} title="Couleurs">
              <ColorRow label="Couleur principale" colorKey="primary_color" form={form} update={update} />
              <ColorRow label="Couleur secondaire" colorKey="secondary_color" form={form} update={update} />
              <ColorRow label="Couleur du bouton CTA" colorKey="button_color" form={form} update={update} />
              <ColorRow label="Texte du bouton" colorKey="button_text_color" form={form} update={update} />
              <ColorRow label="Badge promo" colorKey="badge_color" form={form} update={update} />
            </SectionCard>

            {/* Section 3: Typographie */}
            <SectionCard icon={<Type className="h-4 w-4" />} title="Typographie">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Police des titres</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FONTS.map(font => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => update('heading_font', font)}
                      style={{ fontFamily: font + ', sans-serif' }}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left',
                        form.heading_font === font
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Police du corps</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FONTS.map(font => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => update('body_font', font)}
                      style={{ fontFamily: font + ', sans-serif' }}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs transition-all text-left',
                        form.body_font === font
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      )}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Taille des titres</Label>
                  <PillGroup options={['Compact', 'Normal', 'Large'] as const} value={form.title_size as 'Compact' | 'Normal' | 'Large'} onChange={v => update('title_size', v)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Espacement</Label>
                  <PillGroup options={['Compact', 'Comfortable', 'Spacious'] as const} value={form.spacing_density as 'Compact' | 'Comfortable' | 'Spacious'} onChange={v => update('spacing_density', v)} />
                </div>
              </div>
            </SectionCard>

            {/* Section 4: Bouton CTA */}
            <SectionCard icon={<MousePointer2 className="h-4 w-4" />} title="Bouton d'achat (CTA)">
              <div className="grid gap-2">
                <Label className="text-xs font-medium">Texte du bouton</Label>
                <div className="flex flex-wrap gap-2">
                  {CTA_PRESETS.map(cta => (
                    <button
                      key={cta}
                      type="button"
                      onClick={() => { setIsCustomCta(false); update('cta_label', cta); }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                        !isCustomCta && form.cta_label === cta
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      {cta}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomCta(true)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                      isCustomCta
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    Personnalisé…
                  </button>
                </div>
                {isCustomCta && (
                  <Input
                    value={customCta}
                    maxLength={25}
                    onChange={e => { setCustomCta(e.target.value); update('cta_label', e.target.value); }}
                    placeholder="Texte personnalisé (max 25 car.)"
                    className="h-9 text-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Arrondi du bouton</Label>
                  <PillGroup options={['Sharp', 'Medium', 'Pill'] as const} value={form.button_radius as 'Sharp' | 'Medium' | 'Pill'} onChange={v => update('button_radius', v)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-medium">Largeur</Label>
                  <PillGroup options={['Full width', 'Fit content'] as const} value={form.button_width as 'Full width' | 'Fit content'} onChange={v => update('button_width', v)} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Animation</Label>
                <PillGroup options={['None', 'Bounce', 'Pulse', 'Shake', 'Shine'] as const} value={form.button_animation as 'None' | 'Bounce' | 'Pulse' | 'Shake' | 'Shine'} onChange={v => update('button_animation', v)} />
              </div>

              {/* Live button preview */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-center">
                <button
                  style={{
                    background: form.button_color,
                    color: form.button_text_color,
                    borderRadius: form.button_radius === 'Sharp' ? '4px' : form.button_radius === 'Pill' ? '999px' : '8px',
                    padding: '8px 20px',
                    fontFamily: form.body_font + ', sans-serif',
                    fontWeight: 600,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'default',
                    width: form.button_width === 'Full width' ? '100%' : 'auto',
                    maxWidth: 280,
                  }}
                >
                  {form.cta_label || 'Acheter maintenant'}
                </button>
              </div>
            </SectionCard>

            {/* Section 5: Style global */}
            <SectionCard icon={<Layers className="h-4 w-4" />} title="Style global">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  {form.dark_mode_enabled ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">Mode sombre</p>
                    <p className="text-xs text-muted-foreground">Activer le thème dark pour votre boutique</p>
                  </div>
                </div>
                <Switch
                  checked={form.dark_mode_enabled}
                  onCheckedChange={v => update('dark_mode_enabled', v)}
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Style des cartes produit</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Soft shadow', 'Border minimal', 'Flat'] as const).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => update('product_card_style', style)}
                      className={cn(
                        'rounded-lg border p-3 text-center transition-all',
                        form.product_card_style === style
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <div className={cn(
                        'h-8 w-full rounded mb-2 bg-muted',
                        style === 'Soft shadow' && 'shadow-md',
                        style === 'Border minimal' && 'border border-border',
                      )} />
                      <span className={cn(
                        'text-xs font-medium',
                        form.product_card_style === style ? 'text-primary' : 'text-muted-foreground',
                      )}>{style}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-medium">Rayon global des bordures</Label>
                <PillGroup options={['Sharp', 'Medium', 'Rounded'] as const} value={form.global_radius as 'Sharp' | 'Medium' | 'Rounded'} onChange={v => update('global_radius', v)} />
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Aperçu en direct</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {shop?.name ?? 'Ma Boutique'}
                </span>
              </div>
              <div className="rounded-xl overflow-hidden border border-border bg-muted/20 p-3">
                <StorefrontPreview form={form} shopName={shop?.name ?? 'Ma Boutique'} />
              </div>
              <p className="text-[10px] text-center text-muted-foreground">
                L'aperçu se met à jour instantanément. Cliquez sur "Enregistrer" pour appliquer.
              </p>
              <div className="pt-1">{SaveButton}</div>
            </div>
          </div>
        </div>

        {/* Bottom save row on mobile */}
        <div className="lg:hidden pt-2 border-t border-border">
          {SaveButton}
        </div>
      </div>
    </DashboardLayout>
  );
}
