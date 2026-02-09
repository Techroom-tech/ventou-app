import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, ChevronDown } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CategoryCombobox } from '@/components/dashboard/CategoryCombobox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DEFAULT_CATEGORIES = ['Électronique', 'Mode', 'Maison & Déco', 'Beauté', 'Alimentaire'];

export default function AddProduct() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('0');
  const [isPublished, setIsPublished] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [images, setImages] = useState<string[]>([]);
  const [seoOpen, setSeoOpen] = useState(false);
  const [slug, setSlug] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setImages((prev) => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!name.trim() || !price.trim()) {
      toast({
        title: t('common.error'),
        description: t('dashboard.addProduct.validation.required'),
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('common.success'),
      description: t('dashboard.addProduct.saved'),
    });
    navigate('/dashboard/products');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/products')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">
            {t('dashboard.addProduct.title')}
          </h2>
        </div>

        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('dashboard.addProduct.generalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">
                {t('dashboard.addProduct.name')}
              </Label>
              <Input
                id="product-name"
                placeholder={t('dashboard.addProduct.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">
                {t('dashboard.addProduct.description')}
              </Label>
              <Textarea
                id="product-description"
                placeholder={t('dashboard.addProduct.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('dashboard.addProduct.category')}</Label>
              <CategoryCombobox
                value={category}
                onChange={setCategory}
                categories={categories}
                onAddCategory={(cat) => setCategories((prev) => [...prev, cat])}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('dashboard.addProduct.pricing')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                {t('dashboard.addProduct.originalPrice')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  FCFA
                </span>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-14"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-price">
                {t('dashboard.addProduct.discountPrice')}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  FCFA
                </span>
                <Input
                  id="discount-price"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="pl-14"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.addProduct.discountHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('dashboard.addProduct.inventory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sku">
                {t('dashboard.addProduct.sku')}
              </Label>
              <Input
                id="sku"
                placeholder={t('dashboard.addProduct.skuPlaceholder')}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">
                {t('dashboard.addProduct.stockQuantity')}
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('dashboard.addProduct.status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.addProduct.statusHint')}
                </p>
                <p className="text-xs font-medium">
                  {t('dashboard.addProduct.currently')}:{' '}
                  <span className={cn(
                    'font-semibold',
                    isPublished ? 'text-[hsl(var(--ventou-success))]' : 'text-muted-foreground'
                  )}>
                    {isPublished
                      ? t('dashboard.addProduct.published')
                      : t('dashboard.addProduct.draft')}
                  </span>
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Media */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('dashboard.addProduct.media')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {t('dashboard.addProduct.clickUpload')}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('dashboard.addProduct.dragDrop')}
              </span>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEO Settings */}
        <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t('dashboard.addProduct.seo')}
                  </CardTitle>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    seoOpen && 'rotate-180'
                  )} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    {t('dashboard.addProduct.urlSlug')}
                  </Label>
                  <Input
                    id="slug"
                    placeholder={t('dashboard.addProduct.slugPlaceholder')}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-desc">
                    {t('dashboard.addProduct.metaDescription')}
                  </Label>
                  <Textarea
                    id="meta-desc"
                    placeholder={t('dashboard.addProduct.metaPlaceholder')}
                    maxLength={160}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {metaDescription.length}/160
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Sticky Footer */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 lg:left-60 right-0 bg-card border-t p-4 flex justify-end gap-3 z-30">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/products')}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {t('dashboard.addProduct.savePublish')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
