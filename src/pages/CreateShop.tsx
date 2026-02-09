import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store, Upload, Check, X, Loader2, MessageCircle, Palette, Globe, Camera } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const SHOP_CATEGORIES = [
  'fashion', 'electronics', 'food', 'beauty', 'home', 'sports', 'books', 'art', 'services', 'other'
] as const;

const COUNTRIES = [
  'Ivory Coast', 'Senegal', 'Ghana', 'Nigeria', 'Cameroon', 'Mali', 'Burkina Faso', 'Togo', 'Benin', 'Guinea'
] as const;

const COLOR_PRESETS = [
  '#1E3A5F', '#FF6B35', '#2D6A4F', '#7B2D8E', '#C41E3A', '#1A73E8', '#E67E22', '#16A085',
];

const formSchema = z.object({
  name: z.string().min(2, { message: 'min2' }).max(50),
  description: z.string().max(200).optional(),
  category: z.string().min(1, { message: 'required' }),
  country: z.string().min(1),
  city: z.string().optional(),
  whatsapp: z.string().regex(/^\+?\d{8,15}$/, { message: 'invalidPhone' }).optional().or(z.literal('')),
  slug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/, { message: 'slugFormat' }),
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

function ShopPreview({ values, logoPreview, bannerPreview }: {
  values: Partial<FormValues>;
  logoPreview: string | null;
  bannerPreview: string | null;
}) {
  const { t } = useTranslation();
  const primaryColor = values.primary_color || '#1E3A5F';

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Banner */}
      <div className="h-28 relative" style={{ backgroundColor: primaryColor }}>
        {bannerPreview && (
          <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
        )}
        {/* Logo */}
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="pt-10 p-4 space-y-3">
        <div>
          <h3 className="font-bold text-lg">{values.name || t('createShop.preview.shopName')}</h3>
          {values.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {t(`createShop.categories.${values.category}`)}
            </span>
          )}
        </div>
        {values.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{values.description}</p>
        )}
        {values.slug && (
          <p className="text-xs text-muted-foreground">{values.slug}.ventou.shop</p>
        )}
        {values.whatsapp && (
          <Button size="sm" className="w-full gap-2" style={{ backgroundColor: '#25D366', color: 'white' }}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CreateShop() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
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

  // Check slug availability with debounce
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    setSlugSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('check-slug', {
        body: { slug },
      });

      if (error) throw error;

      if (data.available) {
        setSlugStatus('available');
      } else {
        setSlugStatus('taken');
        setSlugSuggestions(data.suggestions || []);
      }
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkSlug(watchedValues.slug);
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedValues.slug, checkSlug]);

  const handleFileUpload = (type: 'logo' | 'banner', file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t('createShop.errors.fileTooLarge'), variant: 'destructive' });
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
    if (!user) return;
    if (slugStatus === 'taken') {
      toast({ title: t('createShop.errors.slugTaken'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create shop first to get ID
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          category: values.category,
          country: values.country,
          city: values.city || null,
          whatsapp: values.whatsapp || null,
          primary_color: values.primary_color,
          currency: 'XOF',
        })
        .select('id')
        .single();

      if (shopError) throw shopError;

      // 2. Upload assets
      if (logoFile) {
        const { error } = await supabase.storage
          .from('shop-assets')
          .upload(`${shop.id}/logo`, logoFile, { upsert: true });
        if (!error) {
          const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(`${shop.id}/logo`);
          await supabase.from('shops').update({ logo_url: urlData.publicUrl }).eq('id', shop.id);
        }
      }

      if (bannerFile) {
        const { error } = await supabase.storage
          .from('shop-assets')
          .upload(`${shop.id}/banner`, bannerFile, { upsert: true });
        if (!error) {
          const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(`${shop.id}/banner`);
          await supabase.from('shops').update({ banner_url: urlData.publicUrl }).eq('id', shop.id);
        }
      }

      toast({ title: t('createShop.success') });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating shop:', error);
      toast({
        title: t('createShop.errors.generic'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPanel = (
    <ShopPreview values={watchedValues} logoPreview={logoPreview} bannerPreview={bannerPreview} />
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('createShop.title')}</h1>
          <p className="text-muted-foreground">{t('createShop.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Section 1: Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Store className="h-5 w-5" />
                      {t('createShop.sections.basicInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShop.fields.name')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('createShop.fields.namePlaceholder')} {...field} />
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
                          <FormLabel>{t('createShop.fields.description')}</FormLabel>
                          <FormControl>
                            <Textarea placeholder={t('createShop.fields.descriptionPlaceholder')} className="resize-none" rows={3} {...field} />
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
                            <FormLabel>{t('createShop.fields.category')}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('createShop.fields.categoryPlaceholder')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SHOP_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {t(`createShop.categories.${cat}`)}
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
                            <FormLabel>{t('createShop.fields.country')}</FormLabel>
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
                          <FormLabel>{t('createShop.fields.city')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('createShop.fields.cityPlaceholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 2: Branding */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Palette className="h-5 w-5" />
                      {t('createShop.sections.branding')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo upload */}
                    <div>
                      <Label>{t('createShop.fields.logo')}</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <label className="cursor-pointer">
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span>
                                <Upload className="h-4 w-4 mr-1" />
                                {t('createShop.fields.uploadLogo')}
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleFileUpload('logo', e.target.files[0])}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">{t('createShop.fields.imageHint')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Banner upload */}
                    <div>
                      <Label>{t('createShop.fields.banner')}</Label>
                      <label className="mt-2 block cursor-pointer">
                        <div className="h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted hover:bg-muted/80 transition-colors">
                          {bannerPreview ? (
                            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                              <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mt-1">{t('createShop.fields.uploadBanner')}</p>
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
                          <FormLabel>{t('createShop.fields.primaryColor')}</FormLabel>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {COLOR_PRESETS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                                style={{
                                  backgroundColor: color,
                                  borderColor: field.value === color ? 'hsl(var(--foreground))' : 'transparent',
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

                {/* Section 3: Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageCircle className="h-5 w-5" />
                      {t('createShop.sections.contact')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShop.fields.whatsapp')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('createShop.fields.whatsappPlaceholder')} {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">{t('createShop.fields.whatsappHint')}</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Section 4: URL / Slug */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="h-5 w-5" />
                      {t('createShop.sections.url')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('createShop.fields.slug')}</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input {...field} className="font-mono" />
                            </FormControl>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">.ventou.shop</span>
                            {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {slugStatus === 'available' && <Check className="h-5 w-5 text-[hsl(var(--ventou-success))]" />}
                            {slugStatus === 'taken' && <X className="h-5 w-5 text-destructive" />}
                          </div>
                          {slugStatus === 'taken' && slugSuggestions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">{t('createShop.fields.slugSuggestions')}</p>
                              <div className="flex flex-wrap gap-2">
                                {slugSuggestions.map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => form.setValue('slug', s)}
                                    className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
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

                {/* Mobile preview toggle */}
                {isMobile && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button type="button" variant="outline" className="w-full">
                        {t('createShop.preview.show')}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh]">
                      <SheetHeader>
                        <SheetTitle>{t('createShop.preview.title')}</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        {previewPanel}
                      </div>
                    </SheetContent>
                  </Sheet>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isSubmitting || slugStatus === 'taken'}
                  className="w-full h-12 text-base font-semibold btn-ventou"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t('createShop.submit')
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Desktop Preview - 1 col */}
          {!isMobile && (
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('createShop.preview.title')}
                </h3>
                {previewPanel}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
