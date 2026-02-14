import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft, Save, Rocket, ChevronDown, Loader2,
  Package, Globe, Search, Eye, EyeOff, FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { RichTextEditor } from '@/components/addproduct/RichTextEditor';
import { ImageUploader } from '@/components/addproduct/ImageUploader';
import { VariantsManager, type VariantInput } from '@/components/addproduct/VariantsManager';
import { TagsInput } from '@/components/addproduct/TagsInput';
import { cn } from '@/lib/utils';
import type { ProductStatus, ProductType } from '@/types/shop';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(200),
  price: z.number().min(0, 'Le prix doit être positif'),
  compare_at_price: z.number().nullable(),
  stock_quantity: z.number().int().min(0),
}).refine(
  (d) => !d.compare_at_price || d.compare_at_price > d.price,
  { message: 'Le prix barré doit être supérieur au prix de vente', path: ['compare_at_price'] }
);

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export default function AddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shop, isLoading: shopLoading } = useShop();
  const { user } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [descriptionJson, setDescriptionJson] = useState<Record<string, unknown> | null>(null);
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [trackStock, setTrackStock] = useState(true);
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [productType, setProductType] = useState<ProductType>('physical');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [images, setImages] = useState<Array<{ id?: string; url: string; storage_path: string; is_primary: boolean; position: number }>>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['info', 'images', 'pricing']));
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<string>('');
  const productIdRef = useRef<string | null>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugEdited]);

  // Section toggle with max 5 open
  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 5) {
          const first = next.values().next().value;
          if (first) next.delete(first);
        }
        next.add(id);
      }
      return next;
    });
  };

  // Discount badge
  const discountPercent = (() => {
    const p = Number(price);
    const cp = Number(compareAtPrice);
    if (cp > 0 && p > 0 && cp > p) {
      return Math.round(((cp - p) / cp) * 100);
    }
    return 0;
  })();

  // Validate form
  const validate = () => {
    const result = productSchema.safeParse({
      name,
      price: Number(price) || 0,
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      stock_quantity: Number(stockQuantity) || 0,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errs[issue.path[0] as string] = issue.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  // Save product to Supabase
  const saveProduct = useCallback(async (publishStatus?: ProductStatus) => {
    if (!shop) {
      toast({ title: 'Erreur', description: 'Boutique introuvable', variant: 'destructive' });
      return null;
    }

    const finalStatus = publishStatus || status;
    const productData = {
      shop_id: shop.id,
      name: name.trim(),
      slug: slug || generateSlug(name),
      description: descriptionJson ? JSON.stringify(descriptionJson) : null,
      description_json: descriptionJson,
      price: Number(price) || 0,
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      stock_quantity: Number(stockQuantity) || 0,
      track_stock: trackStock,
      status: finalStatus,
      is_active: finalStatus === 'published',
      category: category || null,
      tags,
      product_type: productType,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      image_url: images.find((i) => i.is_primary)?.url || images[0]?.url || null,
    };

    setSaving(true);
    try {
      let productId = productIdRef.current;

      if (productId) {
        // Update existing
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();
        if (error) throw error;
        productId = data.id;
        productIdRef.current = productId;
      }

      // Save images
      if (productId && images.length > 0) {
        // Delete existing images and re-insert
        await supabase.from('product_images').delete().eq('product_id', productId);
        const imgRows = images.map((img, i) => ({
          product_id: productId!,
          url: img.url,
          storage_path: img.storage_path,
          position: i,
          is_primary: img.is_primary,
        }));
        await supabase.from('product_images').insert(imgRows);
      }

      // Save variants
      if (productId && variants.length > 0) {
        await supabase.from('product_variants').delete().eq('product_id', productId);
        const validVariants = variants.filter((v) => v.name.trim() && v.value.trim());
        if (validVariants.length > 0) {
          const varRows = validVariants.map((v) => ({
            product_id: productId!,
            name: v.name.trim(),
            value: v.value.trim(),
            price: v.price ? Number(v.price) : null,
            stock_quantity: Number(v.stock) || 0,
          }));
          await supabase.from('product_variants').insert(varRows);
        }
      }

      lastSavedRef.current = JSON.stringify(productData);
      return productId;
    } catch (err: any) {
      console.error('Save error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [shop, name, slug, descriptionJson, price, compareAtPrice, stockQuantity, trackStock, status, category, tags, productType, metaTitle, metaDescription, images, variants]);

  // Auto-save every 10 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      if (!name.trim() || !shop || saving) return;
      const currentState = JSON.stringify({ name, slug, descriptionJson, price, compareAtPrice, stockQuantity });
      if (currentState === lastSavedRef.current) return;

      try {
        await saveProduct();
        lastSavedRef.current = currentState;
      } catch {
        // Silent fail for auto-save
      }
    }, 10000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [saveProduct, name, shop, saving]);

  // Handlers
  const handleSaveDraft = async () => {
    if (!name.trim()) {
      setErrors({ name: 'Le nom est obligatoire' });
      return;
    }
    try {
      await saveProduct('draft');
      toast({ title: 'Brouillon sauvegardé', description: 'Votre produit a été enregistré.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le produit.', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    if (!validate()) {
      toast({ title: 'Erreur de validation', description: 'Veuillez corriger les erreurs.', variant: 'destructive' });
      return;
    }
    try {
      await saveProduct('published');
      toast({ title: 'Produit publié !', description: 'Votre produit est maintenant visible.' });
      navigate('/dashboard/products');
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de publier le produit.', variant: 'destructive' });
    }
  };

  if (shopLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6 p-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const SectionCard = ({ id, title, icon: Icon, children }: {
    id: string; title: string; icon: React.ElementType; children: React.ReactNode;
  }) => (
    <Collapsible open={openSections.has(id)} onOpenChange={() => toggleSection(id)}>
      <Card className="animate-in fade-in-50 duration-300">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openSections.has(id) && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Ajouter un produit</h2>
          {saving && (
            <Badge variant="secondary" className="gap-1 ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde...
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Main Info */}
            <SectionCard id="info" title="Informations principales" icon={FileText}>
              <div className="space-y-2">
                <Label htmlFor="product-name">Nom du produit *</Label>
                <Input
                  id="product-name"
                  placeholder="Ex: T-shirt en coton bio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(errors.name && 'border-destructive')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-slug">Slug URL</Label>
                <Input
                  id="product-slug"
                  placeholder="t-shirt-coton-bio"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
                  className="font-mono text-sm"
                />
                {shop && slug && (
                  <p className="text-xs text-muted-foreground">
                    https://{shop.slug}.ventou.shop/produit/{slug}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor content={descriptionJson} onChange={setDescriptionJson} />
              </div>
            </SectionCard>

            {/* Section 2: Images */}
            <SectionCard id="images" title="Images produit" icon={Eye}>
              {shop ? (
                <ImageUploader images={images} onChange={setImages} shopId={shop.id} />
              ) : (
                <p className="text-sm text-muted-foreground">Chargement de la boutique...</p>
              )}
            </SectionCard>

            {/* Section 3: Pricing & Stock */}
            <SectionCard id="pricing" title="Prix & Stock" icon={Package}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix de vente (FCFA) *</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={cn(errors.price && 'border-destructive')}
                  />
                  {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Prix barré (FCFA)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      className={cn(errors.compare_at_price && 'border-destructive')}
                    />
                    {discountPercent > 0 && (
                      <Badge className="bg-[hsl(var(--ventou-success))] text-white shrink-0">
                        -{discountPercent}%
                      </Badge>
                    )}
                  </div>
                  {errors.compare_at_price && <p className="text-xs text-destructive">{errors.compare_at_price}</p>}
                  <p className="text-xs text-muted-foreground">Doit être supérieur au prix de vente</p>
                </div>
              </div>
              {price && (
                <p className="text-sm text-muted-foreground">
                  Affiché : <span className="font-semibold text-foreground">{formatCurrency(Number(price))}</span>
                  {discountPercent > 0 && compareAtPrice && (
                    <span className="ml-2 line-through">{formatCurrency(Number(compareAtPrice))}</span>
                  )}
                </p>
              )}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Suivi de stock</Label>
                  <p className="text-xs text-muted-foreground">Suivre les quantités automatiquement</p>
                </div>
                <Switch checked={trackStock} onCheckedChange={setTrackStock} />
              </div>
              {trackStock && (
                <div className="space-y-2">
                  <Label>Quantité en stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                </div>
              )}
            </SectionCard>

            {/* Section 4: Variants */}
            <SectionCard id="variants" title="Variantes" icon={Package}>
              <p className="text-sm text-muted-foreground">Ajoutez des variantes comme la taille, la couleur, etc.</p>
              <VariantsManager variants={variants} onChange={setVariants} />
            </SectionCard>
          </div>

          {/* RIGHT COLUMN - Sticky */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {/* Section 5: Visibility */}
            <Card className="animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {status === 'published' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  Visibilité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={status} onValueChange={(v) => setStatus(v as ProductStatus)} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="draft" id="status-draft" />
                    <Label htmlFor="status-draft" className="cursor-pointer">Brouillon</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="published" id="status-published" />
                    <Label htmlFor="status-published" className="cursor-pointer">Publié</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hidden" id="status-hidden" />
                    <Label htmlFor="status-hidden" className="cursor-pointer">Caché</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Section 6: Organization */}
            <Card className="animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="text-base">Organisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Input
                    placeholder="Ex: Vêtements"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagsInput tags={tags} onChange={setTags} />
                </div>
                <div className="space-y-2">
                  <Label>Type de produit</Label>
                  <RadioGroup value={productType} onValueChange={(v) => setProductType(v as ProductType)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="physical" id="type-physical" />
                      <Label htmlFor="type-physical" className="cursor-pointer">Physique</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="digital" id="type-digital" />
                      <Label htmlFor="type-digital" className="cursor-pointer">Digital</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Section 7: SEO */}
            <Collapsible open={openSections.has('seo')} onOpenChange={() => toggleSection('seo')}>
              <Card className="animate-in fade-in-50 duration-300">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">SEO</CardTitle>
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', openSections.has('seo') && 'rotate-180')} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Titre SEO</Label>
                      <Input
                        placeholder={name || 'Titre de la page'}
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        maxLength={60}
                      />
                      <p className="text-xs text-muted-foreground text-right">{metaTitle.length}/60</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Meta description</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Description pour les moteurs de recherche..."
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        maxLength={160}
                      />
                      <p className="text-xs text-muted-foreground text-right">{metaDescription.length}/160</p>
                    </div>
                    {shop && slug && (
                      <div className="p-3 rounded-md bg-muted/50 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Aperçu URL :</p>
                        <p className="text-sm text-primary font-mono break-all">
                          https://{shop.slug}.ventou.shop/produit/{slug}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving || !name.trim()}
                className="w-full h-12 text-base"
              >
                <Save className="h-4 w-4 mr-2" /> Sauvegarder brouillon
              </Button>
              <Button
                onClick={handlePublish}
                disabled={saving || !name.trim() || !price}
                className="w-full h-12 text-base btn-ventou"
              >
                <Rocket className="h-4 w-4 mr-2" /> Publier produit
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile sticky footer */}
        <div className="fixed bottom-16 left-0 right-0 bg-card border-t p-3 flex gap-2 z-30 lg:hidden">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || !name.trim()} className="flex-1 h-12">
            <Save className="h-4 w-4 mr-2" /> Brouillon
          </Button>
          <Button onClick={handlePublish} disabled={saving || !name.trim() || !price} className="flex-1 h-12 btn-ventou">
            <Rocket className="h-4 w-4 mr-2" /> Publier
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
