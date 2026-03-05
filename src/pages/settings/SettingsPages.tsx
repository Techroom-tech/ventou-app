import { useState } from 'react';
import { Info, Shield, Scale, FileText, HelpCircle, Mail, ChevronRight, Copy, RotateCcw, Eye, EyeOff, Plus, Trash2, Tag, X } from 'lucide-react';
import { motion } from 'framer-motion';
import BlockEditor from '@/components/settings/BlockEditor';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useStorePages,
  DEFAULT_PAGES,
  getTagsForPageType,
  getDefaultTemplate,
  type StorePage,
} from '@/hooks/useStorePages';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';

const ICON_MAP: Record<string, React.ElementType> = {
  Info, Shield, Scale, FileText, HelpCircle, Mail,
};

export interface FAQItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  { question: 'Comment passer une commande ?', answer: 'Ajoutez les produits au panier, remplissez vos coordonnées et validez. Vous recevrez une confirmation par WhatsApp.' },
  { question: 'Quels sont les modes de paiement ?', answer: 'Nous acceptons le paiement à la livraison (COD) et via WhatsApp.' },
  { question: 'Combien coûte la livraison ?', answer: 'Les frais de livraison dépendent de votre zone. Contactez-nous pour plus de détails.' },
];

export default function SettingsPages() {
  const { pages, isLoading, upsertPage, shopId } = useStorePages();
  const [editingPage, setEditingPage] = useState<(typeof DEFAULT_PAGES)[number] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const mergedPages = DEFAULT_PAGES.map((def) => {
    const saved = pages.find((p) => p.slug === def.slug);
    return { ...def, saved };
  });

  const openEditor = (page: (typeof DEFAULT_PAGES)[number]) => {
    setEditingPage(page);
    setEditorOpen(true);
  };

  return (
    <SettingsPageLayout title="Pages" description="Gérez les pages de votre boutique (À propos, CGV, FAQ…)">
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {mergedPages.map((page, index) => {
            const IconComp = ICON_MAP[page.icon] ?? FileText;
            const status = page.saved?.status ?? 'draft';
            return (
              <motion.div
                key={page.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
                onClick={() => openEditor(page)}
                className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card cursor-pointer transition-all duration-150 hover:bg-accent/50 hover:border-border/80"
              >
                <div className="w-9 h-9 rounded-[10px] bg-muted flex items-center justify-center shrink-0">
                  <IconComp className="h-[18px] w-[18px] text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-foreground leading-tight">{page.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{page.description}</p>
                </div>
                <div
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0',
                    status === 'published'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                  )}
                >
                  {status === 'published' ? 'Publié' : 'Brouillon'}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </motion.div>
            );
          })}
        </div>
      )}

      {editingPage && shopId && (
        <PageEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          pageDef={editingPage}
          saved={pages.find((p) => p.slug === editingPage.slug)}
          shopId={shopId}
          onSave={(content, status) => {
            upsertPage.mutate({
              shop_id: shopId,
              slug: editingPage.slug,
              title: editingPage.title,
              description: editingPage.description,
              icon: editingPage.icon,
              content,
              status,
              page_type: editingPage.page_type,
            });
          }}
        />
      )}
    </SettingsPageLayout>
  );
}

// ── Tags Modal ──
function TagsModal({
  open,
  onOpenChange,
  pageType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageType: string;
}) {
  const tags = getTagsForPageType(pageType);
  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`${tag} copié`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-w-[calc(100vw-2rem)] p-0 gap-0 rounded-xl [&>button.absolute]:hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <DialogTitle className="text-base font-semibold">Tags dynamiques</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Insérez ces tags dans votre contenu — ils seront remplacés par les données de votre boutique.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 pb-5">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-medium h-9">Donnée</TableHead>
                  <TableHead className="text-xs font-medium h-9">Tag</TableHead>
                  <TableHead className="text-xs font-medium h-9 w-14 text-right">Copier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((t) => (
                  <TableRow key={t.tag} className="hover:bg-muted/30">
                    <TableCell className="text-sm py-2.5 text-foreground">{t.label}</TableCell>
                    <TableCell className="py-2.5">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-foreground">{t.tag}</code>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyTag(t.tag)}>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FAQ Editor ──
function FAQEditor({
  items,
  onChange,
}: {
  items: FAQItem[];
  onChange: (items: FAQItem[]) => void;
}) {
  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    if (items.length >= 5) {
      toast.error('Maximum 5 questions autorisées');
      return;
    }
    onChange([...items, { question: '', answer: '' }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Questions / Réponses</h3>
          <p className="text-xs text-muted-foreground">{items.length}/5 questions</p>
        </div>
        <Button variant="outline" size="sm" onClick={addItem} disabled={items.length >= 5} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter
        </Button>
      </div>

      {items.map((item, i) => (
        <div key={i} className="border rounded-xl p-4 space-y-3 bg-card">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-1">
              {i + 1}
            </div>
            <div className="flex-1 space-y-2">
              <Input placeholder="Question…" value={item.question} onChange={(e) => updateItem(i, 'question', e.target.value)} className="text-sm font-medium h-9" />
              <Textarea placeholder="Réponse…" value={item.answer} onChange={(e) => updateItem(i, 'answer', e.target.value)} className="text-sm min-h-[80px] resize-none" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-1" onClick={() => removeItem(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl border-dashed">
          Aucune question. Cliquez sur "Ajouter" pour commencer.
        </div>
      )}
    </div>
  );
}

// ── Full-screen page editor modal ──
function PageEditorModal({
  open,
  onOpenChange,
  pageDef,
  saved,
  shopId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pageDef: (typeof DEFAULT_PAGES)[number];
  saved?: StorePage;
  shopId: string;
  onSave: (content: Record<string, unknown>, status: 'published' | 'draft') => void;
}) {
  const [status, setStatus] = useState<'published' | 'draft'>(saved?.status ?? 'draft');
  const [tagsOpen, setTagsOpen] = useState(false);
  const isFAQ = pageDef.page_type === 'faq';
  const initialContent = saved?.content ?? getDefaultTemplate(pageDef.page_type);
  const pageTags = getTagsForPageType(pageDef.page_type);
  const [editorContent, setEditorContent] = useState<Record<string, unknown>>(initialContent as Record<string, unknown>);
  const [editorKey, setEditorKey] = useState(0);

  // FAQ state
  const [faqItems, setFaqItems] = useState<FAQItem[]>(() => {
    if (isFAQ && saved?.content && (saved.content as any).faq_items) {
      return (saved.content as any).faq_items as FAQItem[];
    }
    return DEFAULT_FAQ_ITEMS;
  });

  const handleSave = (saveStatus: 'published' | 'draft') => {
    if (isFAQ) {
      const validItems = faqItems.filter(f => f.question.trim() && f.answer.trim());
      onSave({ faq_items: validItems } as Record<string, unknown>, saveStatus);
    } else {
      onSave(editorContent, saveStatus);
    }
    onOpenChange(false);
  };

  const handleReset = () => {
    if (isFAQ) {
      setFaqItems(DEFAULT_FAQ_ITEMS);
      toast.info('FAQ réinitialisée');
    } else {
      const template = getDefaultTemplate(pageDef.page_type);
      setEditorContent(template);
      setEditorKey((k) => k + 1);
      toast.info('Template réinitialisé');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] lg:max-w-[900px] w-full max-w-full max-h-[100dvh] sm:max-h-[90vh] h-[100dvh] sm:h-auto p-0 flex flex-col gap-0 rounded-none sm:rounded-lg [&>button.absolute]:hidden">
          {/* Header */}
          <div className="bg-background border-b px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-lg font-bold truncate">{pageDef.title}</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{pageDef.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setStatus(status === 'published' ? 'draft' : 'published')}
              >
                {status === 'published' ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                <span className="hidden sm:inline">{status === 'published' ? 'Publié' : 'Brouillon'}</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
                <span className="sr-only">Fermer</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </Button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-5">
            {/* Template reset */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Template par défaut</p>
                  <p className="text-xs text-muted-foreground">Réinitialisez avec le template par défaut.</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Réinitialiser
                </Button>
              </div>
            </div>

            <Separator />

            {/* Dynamic tags compact section */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Tags dynamiques</h3>
                <p className="text-xs text-muted-foreground">{pageTags.length} tags disponibles pour cette page</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setTagsOpen(true)} className="h-8 text-xs">
                <Tag className="h-3.5 w-3.5 mr-1" />
                Voir les tags
              </Button>
            </div>

            <Separator />

            {/* Content */}
            {isFAQ ? (
              <FAQEditor items={faqItems} onChange={setFaqItems} />
            ) : (
              <div className="border rounded-lg overflow-hidden min-h-[350px] sm:min-h-[400px] flex flex-col">
                <BlockEditor
                  content={editorContent}
                  onContentChange={setEditorContent}
                  shopId={shopId}
                />
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="mt-auto bg-background border-t px-4 sm:px-6 py-3 flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" size="default" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button size="default" onClick={() => handleSave(status)}>
              {status === 'published' ? 'Publier' : 'Sauvegarder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tags modal (separate dialog) */}
      <TagsModal open={tagsOpen} onOpenChange={setTagsOpen} pageType={pageDef.page_type} />
    </>
  );
}
