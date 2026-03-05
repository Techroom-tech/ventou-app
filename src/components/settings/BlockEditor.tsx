import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, ImagePlus, Minus, Type,
  Video, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Slash Command Menu ──
interface SlashMenuItem {
  label: string;
  description: string;
  icon: React.ElementType;
  command: string;
}

const SLASH_ITEMS: SlashMenuItem[] = [
  { label: 'Texte', description: 'Paragraphe simple', icon: Type, command: 'paragraph' },
  { label: 'Titre 1', description: 'Grand titre', icon: Heading1, command: 'h1' },
  { label: 'Titre 2', description: 'Titre moyen', icon: Heading2, command: 'h2' },
  { label: 'Titre 3', description: 'Petit titre', icon: Heading3, command: 'h3' },
  { label: 'Liste à puces', description: 'Liste non ordonnée', icon: List, command: 'bullet' },
  { label: 'Liste numérotée', description: 'Liste ordonnée', icon: ListOrdered, command: 'ordered' },
  { label: 'Citation', description: 'Bloc de citation', icon: Quote, command: 'quote' },
  { label: 'Séparateur', description: 'Ligne horizontale', icon: Minus, command: 'divider' },
  { label: 'Image', description: 'Insérer une image', icon: ImagePlus, command: 'image' },
  { label: 'Vidéo', description: 'Intégrer une vidéo (URL)', icon: Video, command: 'video' },
];

function SlashMenu({
  query,
  onSelect,
  position,
}: {
  query: string;
  onSelect: (command: string) => void;
  position: { top: number; left: number };
}) {
  const [selected, setSelected] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtered = SLASH_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.command.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => (s + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => (s - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selected]) onSelect(filtered[selected].command);
      } else if (e.key === 'Escape') {
        onSelect('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selected, onSelect]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-64 max-h-80 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl py-1.5 animate-in fade-in-0 zoom-in-95"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Blocs
      </div>
      {filtered.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.command}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item.command);
            }}
            onMouseEnter={() => setSelected(i)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
              i === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{item.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Toolbar Button ──
function ToolbarBtn({
  icon: Icon,
  active,
  onClick,
  label,
  className,
}: {
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// ── Main BlockEditor ──
export default function BlockEditor({
  content,
  onContentChange,
  shopId,
}: {
  content: Record<string, unknown>;
  onContentChange: (content: Record<string, unknown>) => void;
  shopId: string;
}) {
  const [preview, setPreview] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ open: boolean; query: string; pos: { top: number; left: number } }>({
    open: false,
    query: '',
    pos: { top: 0, left: 0 },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false }),
      Underline,
      LinkExt.configure({ openOnClick: false }),
      ImageExt.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Tapez "/" pour insérer un bloc…' }),
      HorizontalRule,
    ],
    content: content as any,
    editable: !preview,
    editorProps: {
      attributes: {
        class: 'block-editor-content prose prose-sm sm:prose max-w-none focus:outline-none px-4 sm:px-8 py-6',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === '/') {
          // Delay to let the character be inserted first
          setTimeout(() => {
            const sel = window.getSelection();
            if (!sel?.rangeCount) return;
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = editorContainerRef.current?.getBoundingClientRect();
            if (!containerRect) return;
            setSlashMenu({
              open: true,
              query: '',
              pos: { top: rect.bottom + 4, left: Math.max(rect.left, containerRect.left + 16) },
            });
          }, 10);
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getJSON() as Record<string, unknown>);

      // Update slash query
      if (slashMenu.open) {
        const { state } = e;
        const { $from } = state.selection;
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        const slashIndex = textBefore.lastIndexOf('/');
        if (slashIndex === -1) {
          setSlashMenu((s) => ({ ...s, open: false }));
        } else {
          setSlashMenu((s) => ({ ...s, query: textBefore.slice(slashIndex + 1) }));
        }
      }
    },
  });

  // Toggle editable on preview change
  useEffect(() => {
    if (editor) editor.setEditable(!preview);
  }, [preview, editor]);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor || !shopId) return;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
      const path = `${shopId}/pages/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('shop-assets').upload(path, file, { upsert: true });
      if (error) {
        toast.error("Erreur lors de l'upload de l'image");
        return;
      }
      const { data: urlData } = supabase.storage.from('shop-assets').getPublicUrl(path);
      editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
    },
    [editor, shopId]
  );

  const handleSlashSelect = useCallback(
    (command: string) => {
      if (!editor) return;

      // Remove the slash and query text
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = textBefore.lastIndexOf('/');
      if (slashIndex >= 0) {
        const deleteFrom = $from.pos - ($from.parentOffset - slashIndex);
        editor.chain().focus().deleteRange({ from: deleteFrom, to: $from.pos }).run();
      }

      switch (command) {
        case 'paragraph':
          editor.chain().focus().setParagraph().run();
          break;
        case 'h1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'h2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'h3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bullet':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'ordered':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'quote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'divider':
          editor.chain().focus().setHorizontalRule().run();
          break;
        case 'image':
          fileInputRef.current?.click();
          break;
        case 'video': {
          const url = window.prompt('URL de la vidéo YouTube :');
          if (url) {
            // Convert to embed URL
            const videoId = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];
            if (videoId) {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: `[Vidéo: https://www.youtube.com/watch?v=${videoId}]`,
                    },
                  ],
                })
                .run();
            }
          }
          break;
        }
        default:
          break;
      }
      setSlashMenu({ open: false, query: '', pos: { top: 0, left: 0 } });
    },
    [editor]
  );

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashMenu.open) return;
    const handler = (e: MouseEvent) => {
      setSlashMenu((s) => ({ ...s, open: false }));
    };
    // Slight delay so the menu click doesn't close it immediately
    const id = setTimeout(() => window.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(id);
      window.removeEventListener('mousedown', handler);
    };
  }, [slashMenu.open]);

  if (!editor) return null;

  const insertLink = () => {
    const url = window.prompt('URL du lien :');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-background border-b px-2 sm:px-3 py-1.5 flex items-center gap-0.5 sm:gap-1 flex-wrap shrink-0 sticky top-0 z-10">
        {/* Undo/Redo */}
        <ToolbarBtn icon={Undo2} onClick={() => editor.chain().focus().undo().run()} label="Annuler" />
        <ToolbarBtn icon={Redo2} onClick={() => editor.chain().focus().redo().run()} label="Rétablir" />

        <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

        {/* Formatting */}
        <ToolbarBtn icon={Bold} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="Gras" />
        <ToolbarBtn icon={Italic} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italique" />
        <ToolbarBtn icon={UnderlineIcon} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Souligné" />

        <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

        {/* Headings */}
        <ToolbarBtn icon={Heading1} active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Titre 1" />
        <ToolbarBtn icon={Heading2} active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Titre 2" />
        <ToolbarBtn icon={Heading3} active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Titre 3" />

        <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

        {/* Lists & Quote */}
        <ToolbarBtn icon={List} active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Liste à puces" />
        <ToolbarBtn icon={ListOrdered} active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Liste numérotée" />
        <ToolbarBtn icon={Quote} active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Citation" />

        <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

        {/* Alignment */}
        <ToolbarBtn icon={AlignLeft} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} label="Aligner à gauche" />
        <ToolbarBtn icon={AlignCenter} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} label="Centrer" />
        <ToolbarBtn icon={AlignRight} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} label="Aligner à droite" />

        <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />

        {/* Media */}
        <ToolbarBtn icon={Link2} active={editor.isActive('link')} onClick={insertLink} label="Lien" />
        <ToolbarBtn icon={ImagePlus} onClick={() => fileInputRef.current?.click()} label="Image" />
        <ToolbarBtn icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Séparateur" />

      </div>

      {/* Editor content */}
      <div
        ref={editorContainerRef}
        className="flex-1 overflow-y-auto bg-background relative"
      >
        <div className="max-w-[900px] mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Slash menu */}
      {slashMenu.open && (
        <SlashMenu
          query={slashMenu.query}
          onSelect={handleSlashSelect}
          position={slashMenu.pos}
        />
      )}

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
