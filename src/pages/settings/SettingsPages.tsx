import { useState } from 'react';
import { Info, Shield, Scale, FileText, HelpCircle, Mail, ChevronRight, Copy, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useStorePages,
  DEFAULT_PAGES,
  DYNAMIC_TAGS,
  getDefaultTemplate,
  type StorePage,
} from '@/hooks/useStorePages';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';

const ICON_MAP: Record<string, React.ElementType> = {
  Info, Shield, Scale, FileText, HelpCircle, Mail,
};

export default function SettingsPages() {
  const { pages, isLoading, upsertPage, shopId } = useStorePages();
  const [editingPage, setEditingPage] = useState<(typeof DEFAULT_PAGES)[number] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Merge default pages with saved data
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {mergedPages.map((page) => {
            const Icon = ICON_MAP[page.icon] ?? FileText;
            const status = page.saved?.status ?? 'draft';
            return (
              <div
                key={page.slug}
                onClick={() => openEditor(page)}
                className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{page.title}</span>
                    <Badge variant={status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                      {status === 'published' ? 'Publié' : 'Brouillon'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{page.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
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
  const initialContent = saved?.content ?? getDefaultTemplate(pageDef.page_type);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Rédigez le contenu de votre page...' }),
    ],
    content: initialContent as any,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] focus:outline-none p-4',
      },
    },
  });

  const handleSave = () => {
    if (!editor) return;
    onSave(editor.getJSON() as Record<string, unknown>, status);
    onOpenChange(false);
  };

  const handleReset = () => {
    const template = getDefaultTemplate(pageDef.page_type);
    editor?.commands.setContent(template as any);
    toast.info('Template réinitialisé');
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`${tag} copié`);
  };

  if (!editor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{pageDef.title}</h2>
            <p className="text-xs text-muted-foreground">{pageDef.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatus(status === 'published' ? 'draft' : 'published')}
            >
              {status === 'published' ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {status === 'published' ? 'Publié' : 'Brouillon'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={upsertPage?.isPending}>
              Sauvegarder
            </Button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Section 1: Reset */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Template par défaut</p>
                <p className="text-xs text-muted-foreground">Réinitialisez le contenu avec le template par défaut pour cette page.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Réinitialiser
              </Button>
            </div>
          </div>

          <Separator />

          {/* Section 2: Dynamic tags */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Tags dynamiques</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Insérez ces tags dans votre contenu — ils seront remplacés automatiquement par les données de votre boutique.
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Donnée</TableHead>
                    <TableHead className="text-xs">Tag</TableHead>
                    <TableHead className="text-xs w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DYNAMIC_TAGS.map((t) => (
                    <TableRow key={t.tag}>
                      <TableCell className="text-xs py-2">{t.label}</TableCell>
                      <TableCell className="py-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{t.tag}</code>
                      </TableCell>
                      <TableCell className="py-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyTag(t.tag)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copier</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* Section 3: Rich text editor */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Contenu de la page</h3>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border rounded-t-lg bg-muted/30">
              {[
                { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), className: 'font-bold' },
                { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), className: 'italic' },
                { label: 'U', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), className: 'underline' },
                { label: 'H1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
                { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
                { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
                { label: '• List', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
                { label: '1. List', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
                { label: '❝', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
              ].map((btn) => (
                <Button
                  key={btn.label}
                  variant="ghost"
                  size="sm"
                  className={cn('h-7 px-2 text-xs', btn.active && 'bg-primary/15 text-primary', btn.className)}
                  onClick={btn.action}
                  type="button"
                >
                  {btn.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                type="button"
                onClick={() => {
                  const url = window.prompt('URL du lien :');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
              >
                🔗 Lien
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                type="button"
                onClick={() => {
                  const url = window.prompt("URL de l'image :");
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }}
              >
                🖼 Image
              </Button>
            </div>

            {/* Editor */}
            <div className="border border-t-0 rounded-b-lg min-h-[300px] bg-background">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
