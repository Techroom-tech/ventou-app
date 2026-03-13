import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  ArrowLeft, Save, Rocket, ChevronDown, Loader2,
  Package, Globe, Search, Eye, EyeOff, FileText, AlertTriangle,
} from 'lucide-react';

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
import { supabase, formatCurrency } from '@/integrations/supabase/client';
import { RichTextEditor } from '@/components/addproduct/RichTextEditor';
import { ImageUploader } from '@/components/addproduct/ImageUploader';
import { VariantsManager, type VariantInput } from '@/components/addproduct/VariantsManager';
import { TagsInput } from '@/components/addproduct/TagsInput';
import { CategoryPicker, type Category } from '@/components/addproduct/CategoryPicker';
import { cn } from '@/lib/utils';
import type { ProductStatus, ProductType } from '@/types/shop';
import { getProductUrl } from '@/lib/domain';

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

const SectionCard = memo(function SectionCard({ id, title, icon: Icon, isOpen, onToggle, children }: {
  id: string;
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const handleToggle = useCallback(() => onToggle(id), [id, onToggle]);
  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <Card className="animate-in fade-in-50 duration-300">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
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
});

export default function EditProduct() {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shop, isLoading: shopLoading } = useShop();

  // Loading / error state
  const [productLoading, setProductLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state — mirrors AddProduct exactly
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const descriptionJsonRef = useRef<Record<string, unknown> | null>(null);
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [trackStock, setTrackStock] = useState(true);
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [productType, setProductType] = useState<ProductType>('physical');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [images, setImages] = useState<Array<{ id?: string; url: string; storage_path: string; is_primary: boolean; position: number }>>([]);
  const [variants, setVariants] = useState<VariantInput[]>([]);
  const [showInMarketplace, setShowInMarketplace] = useState(true);
  const [marketplaceCategoryId, setMarketplaceCategoryId] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['info', 'images', 'pricing']));
  const lastSavedRef = useRef<string>('');

  // Load categories
  useEffect(() => {
    if (!shop) return;
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('shop_id', shop.id)
      .order('name')
      .then(({ data, error }) => {
        if (error) { console.error('[EditProduct] Failed to load categories:', error); return; }
        if (data) setCategories(data as Category[]);
      });
  }, [shop]);

  // Load existing product — ALWAYS filter by shop_id for security
  useEffect(() => {
    if (!shop || !productId) return;
    setProductLoading(true);

    const load = async () => {
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('*, product_images(*), product_variants(*)')
          .eq('id', productId)
          .eq('shop_id', shop.id) // Security: never trust URL param alone
          .maybeSingle();

        if (error) {
          console.error('[EditProduct] Load error:', error);
          setNotFound(true);
          return;
        }

        if (!product) {
          setNotFound(true);
          return;
        }

        // Populate form fields
        setName(product.name ?? '');
        setSlug(product.slug ?? '');
        setSlugEdited(true); // Don't auto-regenerate slug for existing product
        setPrice(String(product.price ?? ''));
        setCompareAtPrice(product.compare_at_price ? String(product.compare_at_price) : '');
        setStockQuantity(String(product.stock_quantity ?? 0));
        setTrackStock(product.track_stock ?? true);
        setStatus((product.status ?? 'draft') as ProductStatus);
        setCategoryId(product.category_id ?? null);
        setTags(Array.isArray(product.tags) ? product.tags : []);
        setProductType((product.product_type ?? 'physical') as ProductType);
        setMetaTitle(product.meta_title ?? '');
        setMetaDescription(product.meta_description ?? '');
        setShowInMarketplace((product as any).show_in_marketplace ?? true);
        setMarketplaceCategoryId((product as any).marketplace_category_id ?? null);

        // Safely parse description_json
        try {
          if (product.description_json && typeof product.description_json === 'object') {
            descriptionJsonRef.current = product.description_json as Record<string, unknown>;
          } else if (product.description && typeof product.description === 'object') {
            descriptionJsonRef.current = product.description as Record<string, unknown>;
          }
        } catch (e) {
          console.warn('[EditProduct] Could not parse description_json:', e);
          descriptionJsonRef.current = null;
        }

        // Load images
        if (Array.isArray(product.product_images) && product.product_images.length > 0) {
          setImages(
            product.product_images
              .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
              .map((img: any) => ({
                id: img.id,
                url: img.image_url,
                storage_path: '',
                is_primary: (img.position ?? 0) === 0,
                position: img.position ?? 0,
              }))
          );
        } else if (product.image_url) {
          setImages([{ url: product.image_url, storage_path: '', is_primary: true, position: 0 }]);
        }

        // Load variants
        if (Array.isArray(product.product_variants) && product.product_variants.length > 0) {
          setVariants(
            product.product_variants.map((v: any) => ({
              id: v.id,
              name: v.name ?? '',
              value: v.value ?? '',
              price: v.price ? String(v.price) : '',
              stock: String(v.stock ?? 0),
            }))
          );
        }
      } catch (err) {
        console.error('[EditProduct] Unexpected error:', err);
        setNotFound(true);
      } finally {
        setProductLoading(false);
      }
    };

    load();
  }, [shop, productId]);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else {
        if (next.size >= 5) { const first = next.values().next().value; if (first) next.delete(first); }
        next.add(id);
      }
      return next;
    });
  }, []);

  const discountPercent = (() => {
    const p = Number(price);
    const cp = Number(compareAtPrice);
    if (cp > 0 && p > 0 && cp > p) return Math.round(((cp - p) / cp) * 100);
    return 0;
  })();

  const validate = () => {
    const result = productSchema.safeParse({
      name,
      price: Number(price) || 0,
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      stock_quantity: Number(stockQuantity) || 0,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => { errs[issue.path[0] as string] = issue.message; });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  };

  // UPDATE — never INSERT for edit page
  const saveProduct = useCallback(async (publishStatus?: ProductStatus) => {
    if (!shop || !productId) {
      toast({ title: 'Erreur', description: 'Produit ou boutique introuvable', variant: 'destructive' });
      return null;
    }

    const finalStatus = publishStatus || status;
    const productData = {
      name: name.trim(),
      slug: slug || generateSlug(name),
      description: descriptionJsonRef.current || null,
      description_json: descriptionJsonRef.current || null,
      price: Number(price) || 0,
      compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
      stock_quantity: Number(stockQuantity) || 0,
      track_stock: trackStock,
      status: finalStatus,
      is_active: finalStatus === 'published',
      category: categories.find((c) => c.id === categoryId)?.name || null,
      category_id: categoryId || null,
      tags,
      product_type: productType,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      image_url: images.find((i) => i.is_primary)?.url || images[0]?.url || null,
      updated_at: new Date().toISOString(),
      show_in_marketplace: showInMarketplace,
      marketplace_category_id: marketplaceCategoryId || null,
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .eq('shop_id', shop.id); // Double security guard

      if (error) throw error;

      // Save images
      await supabase.from('product_images').delete().eq('product_id', productId);
      if (images.length > 0) {
        const imgRows = images.map((img, i) => ({
          product_id: productId,
          image_url: img.url,
          position: i,
        }));
        const { error: imgError } = await supabase.from('product_images').insert(imgRows);
        if (imgError) console.error('[EditProduct] Image save error:', imgError);
      }

      // Save variants
      await supabase.from('product_variants').delete().eq('product_id', productId);
      if (variants.length > 0) {
        const validVariants = variants.filter((v) => v.name.trim() && v.value.trim());
        if (validVariants.length > 0) {
          const varRows = validVariants.map((v) => ({
            product_id: productId,
            name: v.name.trim(),
            value: v.value.trim(),
            price: v.price ? Number(v.price) : null,
            stock: Number(v.stock) || 0,
          }));
          await supabase.from('product_variants').insert(varRows);
        }
      }

      lastSavedRef.current = JSON.stringify({ name, slug, price, compareAtPrice, stockQuantity });
      return productId;
    } catch (err: any) {
      console.error('[EditProduct] Save error:', err);
      const msg = `${err?.message || ''}${err?.hint ? ` (${err.hint})` : ''}`.trim() || 'Erreur inconnue';
      throw new Error(msg);
    } finally {
      setSaving(false);
    }
  }, [shop, productId, name, slug, price, compareAtPrice, stockQuantity, trackStock, status, categoryId, categories, tags, productType, metaTitle, metaDescription, images, variants, toast]);

  const handleSaveDraft = async () => {
    if (!name.trim()) { setErrors({ name: 'Le nom est obligatoire' }); return; }
    try {
      await saveProduct('draft');
      toast({ title: 'Brouillon sauvegardé', description: 'Votre produit a été mis à jour.' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Impossible de sauvegarder.', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    if (!validate()) { toast({ title: 'Erreur de validation', description: 'Veuillez corriger les erreurs.', variant: 'destructive' }); return; }
    try {
      await saveProduct('published');
      toast({ title: 'Produit mis à jour !', description: 'Votre produit est maintenant visible.' });
      navigate('/dashboard/products');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err?.message || 'Impossible de publier.', variant: 'destructive' });
    }
  };

  const handleDescriptionChange = useCallback((json: Record<string, unknown>) => {
    descriptionJsonRef.current = json;
  }, []);

  const handleCategoryCreated = useCallback((cat: Category) => {
    setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  // Loading skeleton
  if (shopLoading || productLoading) {
    return (
      <>
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
      </>
    );
  }

  // Not found fallback — never show blank page
  if (notFound) {
    return (
      <>
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/products')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <AlertTriangle className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">Produit introuvable</h2>
            <p className="text-muted-foreground max-w-sm">
              Ce produit n'existe pas ou n'appartient pas à votre boutique.
            </p>
            <Button onClick={() => navigate('/dashboard/products')}>
              Retour au catalogue
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Modifier le produit</h2>
          {saving && (
            <Badge variant="secondary" className="gap-1 ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde...
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            <SectionCard id="info" title="Informations principales" icon={FileText} isOpen={openSections.has('info')} onToggle={toggleSection}>
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
                    {getProductUrl(shop.slug, slug)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  content={descriptionJsonRef.current}
                  onChange={handleDescriptionChange}
                  shopId={shop?.id}
                />
              </div>
            </SectionCard>

            <SectionCard id="images" title="Images produit" icon={Eye} isOpen={openSections.has('images')} onToggle={toggleSection}>
              {shop ? (
                <ImageUploader images={images} onChange={setImages} shopId={shop.id} />
              ) : (
                <p className="text-sm text-muted-foreground">Chargement de la boutique...</p>
              )}
            </SectionCard>

            <SectionCard id="pricing" title="Prix & Stock" icon={Package} isOpen={openSections.has('pricing')} onToggle={toggleSection}>
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

            <SectionCard id="variants" title="Variantes" icon={Package} isOpen={openSections.has('variants')} onToggle={toggleSection}>
              <p className="text-sm text-muted-foreground">Ajoutez des variantes comme la taille, la couleur, etc.</p>
              <VariantsManager variants={variants} onChange={setVariants} />
            </SectionCard>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
            {/* Visibility */}
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

            {/* Organisation */}
            <Card className="animate-in fade-in-50 duration-300">
              <CardHeader>
                <CardTitle className="text-base">Organisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  {shop ? (
                    <CategoryPicker
                      shopId={shop.id}
                      value={categoryId}
                      categories={categories}
                      onSelect={setCategoryId}
                      onCategoryCreated={handleCategoryCreated}
                    />
                  ) : (
                    <Skeleton className="h-10" />
                  )}
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

            {/* SEO */}
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
                          {getProductUrl(shop.slug, slug)}
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
                <Rocket className="h-4 w-4 mr-2" /> Mettre à jour
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
            <Rocket className="h-4 w-4 mr-2" /> Mettre à jour
          </Button>
        </div>
      </div>
    </>
  );
}
