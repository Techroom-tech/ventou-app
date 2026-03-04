import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Store, Upload, Check, X, Loader2, MessageCircle,
  Palette, Globe, Camera, ShieldAlert, ArrowLeft, Eye,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShop } from '@/hooks/useShop';
import { getStorefrontDomain, BASE_DOMAIN } from '@/lib/domain';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// ─── Constants ───────────────────────────────────────────────
const SHOP_CATEGORIES = [
  'fashion', 'electronics', 'food', 'beauty', 'home', 'sports', 'books', 'art', 'services', 'other',
] as const;

const COUNTRIES = [
  'Ivory Coast', 'Senegal', 'Ghana', 'Nigeria', 'Cameroon', 'Mali', 'Burkina Faso', 'Togo', 'Benin', 'Guinea',
] as const;

const COLOR_PRESETS = [
  '#1E3A5F', '#FF6B35', '#2D6A4F', '#7B2D8E', '#C41E3A', '#1A73E8', '#E67E22', '#16A085',
];

// ─── Zod Schema ──────────────────────────────────────────────
const formSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit avoir au moins 2 caractères' }).max(50),
  description: z.string().max(200).optional(),
  category: z.string().min(1, { message: 'Choisissez une catégorie' }),
  country: z.string().min(1),
  city: z.string().optional(),
  whatsapp: z.string().regex(/^\+?\d{8,15}$/, { message: 'Format international requis' }).optional().or(z.literal('')),
  slug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/, { message: 'Uniquement lettres minuscules, chiffres et tirets' }),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

type FormValues = z.infer<typeof formSchema>;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function normalizeSubdomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// ─── Shop Preview Component ─────────────────────────────────
function ShopPreview({
  values,
  logoPreview,
  bannerPreview,
}: {
  values: Partial<FormValues>;
  logoPreview: string | null;
  bannerPreview: string | null;
}) {
  const primaryColor = values.primary_color || '#1E3A5F';
  const initial = (values.name || '?')[0]?.toUpperCase() || '?';

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-lg animate-in fade-in duration-500">
      {/* Banner */}
      <div className="h-32 relative" style={{ backgroundColor: primaryColor }}>
        {bannerPreview && (
          <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        {/* Logo avatar */}
        <div className="absolute -bottom-10 left-5">
          <div
            className="w-20 h-20 rounded-full border-4 border-card flex items-center justify-center overflow-hidden shadow-md"
            style={{ backgroundColor: logoPreview ? undefined : primaryColor }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white select-none">{initial}</span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-12 px-5 pb-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg text-card-foreground">
            {values.name || 'Nom de la boutique'}
          </h3>
          {values.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground mt-1 inline-block">
              {values.category}
            </span>
          )}
        </div>

        {values.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{values.description}</p>
        )}

        {values.slug && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
            <Globe className="h-3.5 w-3.5" />
            <span className="font-mono">{getStorefrontDomain(values.slug)}</span>
          </div>
        )}

        {values.whatsapp && (
          <Button
            size="sm"
            className="w-full gap-2"
            style={{ backgroundColor: '#25D366', color: 'white' }}
            type="button"
          >
            <MessageCircle className="h-4 w-4" />
            Contacter via WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Already Has Shop Blocker ────────────────────────────────
function AlreadyHasShop() {
  const navigate = useNavigate();
  return (
    <>
      <div className="max-w-md mx-auto mt-20 text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-card-foreground">Vous avez déjà une boutique</h2>
        <p className="text-muted-foreground">
          Chaque compte ne peut créer qu'une seule boutique. Vous pouvez gérer la vôtre depuis le tableau de bord.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="btn-ventou">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Button>
      </div>
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function CreateShop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { hasShop, isLoading: shopLoading } = useShop();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      country: 'Ivory Coast',
      city: '',
      whatsapp: '',
      slug: '',
      primary_color: '#1E3A5F',
    },
  });

  const watchedValues = form.watch();

  // Auto-generate slug from name
  useEffect(() => {
    const name = form.getValues('name');
    if (name && name.length >= 2) {
      const slug = generateSlug(name);
      form.setValue('slug', slug);
    }
  }, [watchedValues.name]);

  // Debounced slug check
  const checkSlug = useCallback(async (slug: string) => {
    const normalizedSlug = normalizeSubdomain(slug);

    if (!normalizedSlug || normalizedSlug.length < 3) {
      setSlugStatus('idle');
      setSlugSuggestions([]);
      return;
    }

    setSlugStatus('checking');
    setSlugSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('check-slug', {
        body: { slug: normalizedSlug },
      });

      if (error) throw error;

      if (data?.available === true) {
        setSlugStatus('available');
      } else if (data?.error_code === 'INVALID_SUBDOMAIN') {
        setSlugStatus('idle');
      } else {
        setSlugStatus('taken');
        setSlugSuggestions(data?.suggestions || []);
      }
    } catch (err) {
      console.error('check-slug failed:', err);
      setSlugStatus('error');
    }
  }, []);

  useEffect(() => {
    const normalized = normalizeSubdomain(watchedValues.slug || '');
    if ((watchedValues.slug || '') !== normalized) {
      form.setValue('slug', normalized, { shouldValidate: true, shouldDirty: true });
      return;
    }

    const timer = setTimeout(() => {
      checkSlug(normalized);
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedValues.slug, checkSlug, form]);

  const handleFileUpload = (type: 'logo' | 'banner', file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux (max 2 Mo)', variant: 'destructive' });
      return;
    }
    const url = URL.createObjectURL(file);
    if (type === 'logo') {
      setLogoFile(file);
      setLogoPreview(url);
    } else {
      setBannerFile(file);
      setBannerPreview(url);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast({ title: 'Erreur d\'authentification', variant: 'destructive' });
      return;
    }

    if (slugStatus !== 'available') {
      toast({ title: 'Veuillez vérifier votre sous-domaine', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    

    try {
      const normalizedSlug = normalizeSubdomain(values.slug);

      const { data: creationData, error: creationError } = await supabase.functions.invoke('create-shop', {
        body: {
          name: values.name,
          slug: normalizedSlug,
          description: values.description || null,
          category: values.category,
          country: values.country,
          city: values.city || null,
          whatsapp: values.whatsapp || null,
          primary_color: values.primary_color,
        },
      });

      if (creationError) throw creationError;

      if (!creationData?.success || !creationData?.shop_id) {
        const code = creationData?.error_code || 'INTERNAL_ERROR';
        

        if (code === 'STORE_LIMIT_REACHED') {
          toast({
            title: 'Limite de boutiques atteinte',
            description: `Vous avez atteint la limite (${creationData?.stores_count ?? '-'} / ${creationData?.store_limit ?? '-'}) pour votre plan.`,
            variant: 'destructive',
          });
          return;
        }

        if (code === 'SUBDOMAIN_TAKEN') {
          setSlugStatus('taken');
          toast({ title: 'Ce sous-domaine est déjà pris', variant: 'destructive' });
          await checkSlug(normalizedSlug);
          return;
        }

        if (code === 'INVALID_SUBDOMAIN') {
          setSlugStatus('idle');
          toast({ title: 'Sous-domaine invalide', variant: 'destructive' });
          return;
        }

        throw new Error(code);
      }

      const shopId = creationData.shop_id as string;
      const finalSlug = (creationData.normalized_slug as string) || normalizedSlug;

      const uploads: Promise<void>[] = [];

      if (logoFile) {
        uploads.push(
          supabase.storage.from('shop-assets').upload(`${shopId}/logo`, logoFile, { upsert: true })
            .then(({ error }) => {
              if (!error) {
                const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(`${shopId}/logo`);
                return supabase.from('shops').update({ logo_url: urlData.publicUrl }).eq('id', shopId).then(() => {});
              }
            })
        );
      }

      if (bannerFile) {
        uploads.push(
          supabase.storage.from('shop-assets').upload(`${shopId}/banner`, bannerFile, { upsert: true })
            .then(({ error }) => {
              if (!error) {
                const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(`${shopId}/banner`);
                return supabase.from('shops').update({ banner_url: urlData.publicUrl }).eq('id', shopId).then(() => {});
              }
            })
        );
      }

      await Promise.all(uploads);
      await queryClient.invalidateQueries({ queryKey: ['shop'] });

      toast({ title: '🎉 Boutique créée avec succès !' });
      navigate('/dashboard/shop-created', { state: { slug: finalSlug } });
    } catch (error: any) {
      console.error('Error creating shop:', error);
      
      toast({ title: 'Erreur lors de la création', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────
  if (shopLoading) {
    return (
      <>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  // Guard handles hasShop redirect — no check needed here

  const canSubmit = slugStatus === 'available';

  const previewPanel = (
    <ShopPreview values={watchedValues} logoPreview={logoPreview} bannerPreview={bannerPreview} />
  );

  // ─── Render ────────────────────────────────────────────────
  return (
    <>
      <ErrorBoundary fallbackMessage="Erreur lors du chargement du formulaire">
        <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('createShop.title', 'Créer ma boutique')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('createShop.subtitle', 'Configurez votre boutique en ligne en quelques minutes')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* ── Form (3 cols) ─────────────────────────────── */}
            <div className="lg:col-span-3 space-y-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit, (errors) => {
                    console.error('Validation errors:', errors);
                    toast({
                      title: 'Veuillez corriger les erreurs',
                      description: Object.keys(errors).join(', '),
                      variant: 'destructive',
                    });
                  })}
                  className="space-y-6"
                >
                  {/* ── Section 1: Infos principales ───── */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Store className="h-5 w-5 text-accent" />
                        {t('createShop.sections.basicInfo', 'Informations')}
                      </CardTitle>
                      <CardDescription>Les informations principales de votre boutique</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShop.fields.name', 'Nom de la boutique')} *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Ma Boutique Mode" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShop.fields.description', 'Slogan / description')}</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Décrivez votre boutique en une phrase..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('createShop.fields.category', 'Catégorie')} *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SHOP_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {t(`createShop.categories.${cat}`, cat)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('createShop.fields.country', 'Pays')} *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COUNTRIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('createShop.fields.city', 'Ville')}</FormLabel>
                            <FormControl>
                              <Input placeholder="Abidjan, Dakar, Accra..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* ── Section 2: Branding ────────────── */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Palette className="h-5 w-5 text-accent" />
                        {t('createShop.sections.branding', 'Identité visuelle')}
                      </CardTitle>
                      <CardDescription>Personnalisez l'apparence de votre boutique</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Logo */}
                      <div>
                        <Label>Logo</Label>
                        <div className="mt-2 flex items-center gap-4">
                          <div
                            className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-colors"
                            style={{ backgroundColor: logoPreview ? undefined : (watchedValues.primary_color || '#1E3A5F') }}
                          >
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-bold text-white select-none">
                                {(watchedValues.name || '?')[0]?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          <div>
                            <label className="cursor-pointer">
                              <Button type="button" variant="outline" size="sm" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-1" />
                                  Choisir un logo
                                </span>
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload('logo', e.target.files[0])}
                              />
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">PNG, JPG • Max 2 Mo</p>
                          </div>
                        </div>
                      </div>

                      {/* Banner */}
                      <div>
                        <Label>Bannière</Label>
                        <label className="mt-2 block cursor-pointer">
                          <div className="h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/80 transition-colors">
                            {bannerPreview ? (
                              <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center">
                                <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mt-1">Ajouter une bannière</p>
                              </div>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload('banner', e.target.files[0])}
                          />
                        </label>
                      </div>

                      {/* Color picker */}
                      <FormField
                        control={form.control}
                        name="primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Couleur principale</FormLabel>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {COLOR_PRESETS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => field.onChange(color)}
                                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: field.value === color ? 'hsl(var(--foreground))' : 'transparent',
                                    transform: field.value === color ? 'scale(1.15)' : undefined,
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="color"
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border-0"
                              />
                              <Input
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-28 font-mono text-sm"
                                maxLength={7}
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* ── Section 3: Contact ─────────────── */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageCircle className="h-5 w-5 text-accent" />
                        {t('createShop.sections.contact', 'Contact')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Numéro WhatsApp</FormLabel>
                            <FormControl>
                              <Input placeholder="+225 07 00 00 00 00" {...field} />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Format international avec indicatif pays
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* ── Section 4: Sous-domaine ────────── */}
                  <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-accent" />
                        {t('createShop.sections.url', 'Adresse web')}
                      </CardTitle>
                      <CardDescription>Votre boutique sera accessible à cette adresse</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sous-domaine</FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  className="font-mono"
                                  onBlur={(e) => field.onChange(normalizeSubdomain(e.target.value))}
                                />
                              </FormControl>
                              <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
                                .{BASE_DOMAIN}
                              </span>
                              {slugStatus === 'checking' && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                              )}
                              {slugStatus === 'available' && (
                                <Check className="h-5 w-5 text-[hsl(var(--ventou-success))] shrink-0" />
                              )}
                              {slugStatus === 'taken' && (
                                <X className="h-5 w-5 text-destructive shrink-0" />
                              )}
                            </div>

                            {/* Slug status text */}
                            {slugStatus === 'available' && (
                              <p className="text-xs text-[hsl(var(--ventou-success))] flex items-center gap-1 mt-1">
                                <Check className="h-3 w-3" /> Disponible
                              </p>
                            )}
                            {slugStatus === 'taken' && (
                              <p className="text-xs text-destructive mt-1">Ce sous-domaine est déjà pris</p>
                            )}
                            {slugStatus === 'checking' && (
                              <p className="text-xs text-muted-foreground mt-1">Vérification...</p>
                            )}
                            {slugStatus === 'error' && (
                              <p className="text-xs text-destructive mt-1">Erreur de vérification. Réessayez.</p>
                            )}

                            {/* Suggestions */}
                            {slugStatus === 'taken' && slugSuggestions.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-muted-foreground">Suggestions :</p>
                                <div className="flex flex-wrap gap-2">
                                  {slugSuggestions.map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => form.setValue('slug', s)}
                                      className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-mono"
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* ── Mobile preview toggle ──────────── */}
                  {isMobile && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button type="button" variant="outline" className="w-full gap-2">
                          <Eye className="h-4 w-4" />
                          Voir l'aperçu
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[70vh]">
                        <SheetHeader>
                          <SheetTitle>Aperçu de votre boutique</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 px-1">{previewPanel}</div>
                      </SheetContent>
                    </Sheet>
                  )}

                  {/* ── Submit ─────────────────────────── */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !canSubmit}
                    className="w-full h-12 text-base font-semibold btn-ventou transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <Store className="h-5 w-5 mr-2" />
                        Créer ma boutique
                      </>
                    )}
                  </Button>

                  {!canSubmit && (
                    <p className="text-sm text-center text-muted-foreground">
                      {slugStatus === 'checking' && 'Vérification du sous-domaine...'}
                      {slugStatus === 'taken' && 'Choisissez un sous-domaine disponible'}
                      {slugStatus === 'error' && 'Erreur de vérification. Réessayez.'}
                      {slugStatus === 'idle' && 'Remplissez le nom pour générer votre adresse'}
                    </p>
                  )}
                </form>
              </Form>
            </div>

            {/* ── Desktop Preview (2 cols) ──────────────── */}
            {!isMobile && (
              <div className="hidden lg:block lg:col-span-2">
                <div className="sticky top-24 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Aperçu en direct
                  </h3>
                  {previewPanel}
                </div>
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
}
