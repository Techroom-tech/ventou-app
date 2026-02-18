import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
  Link as LinkIcon, Minus, X, Upload, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCallback, useRef, memo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RichTextEditorProps {
  content: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
  shopId?: string;
}

// ToolBtn is stable — defined outside component to avoid recreation
const ToolBtn = memo(({ onClick, active, children }: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={cn('h-8 w-8', active && 'bg-muted')}
    onClick={onClick}
  >
    {children}
  </Button>
));
ToolBtn.displayName = 'ToolBtn';

function ImageUploadDialog({
  shopId,
  onInsert,
  onClose,
}: {
  shopId?: string;
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!shopId) {
      // fallback: use object URL (no Supabase)
      onInsert(URL.createObjectURL(file));
      onClose();
      return;
    }
    setUploading(true);
    try {
      const path = `${shopId}/editor-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      onInsert(data.publicUrl);
      onClose();
    } catch (err) {
      console.error('Editor image upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [shopId, onInsert, onClose]);

  return (
    <div className="absolute z-50 bg-popover border rounded-lg shadow-lg p-4 w-72 top-10 left-1/2 -translate-x-1/2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Insérer une image</p>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex gap-2 mb-3">
        <Button
          type="button"
          variant={tab === 'upload' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => setTab('upload')}
        >
          Uploader
        </Button>
        <Button
          type="button"
          variant={tab === 'url' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 text-xs"
          onClick={() => setTab('url')}
        >
          URL externe
        </Button>
      </div>
      {tab === 'upload' ? (
        <div
          className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Cliquer pour choisir une image</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="https://exemple.com/image.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-sm"
          />
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!url.trim()}
            onClick={() => { onInsert(url.trim()); onClose(); }}
          >
            Insérer
          </Button>
        </div>
      )}
    </div>
  );
}

function LinkDialog({
  onInsert,
  onClose,
}: {
  onInsert: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  return (
    <div className="absolute z-50 bg-popover border rounded-lg shadow-lg p-4 w-64 top-10 left-1/2 -translate-x-1/2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Insérer un lien</p>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-2">
        <Input
          placeholder="https://exemple.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="text-sm"
          onKeyDown={(e) => e.key === 'Enter' && url.trim() && (onInsert(url.trim()), onClose())}
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!url.trim()}
          onClick={() => { onInsert(url.trim()); onClose(); }}
        >
          Insérer
        </Button>
      </div>
    </div>
  );
}

// KEY FIX: use a ref for onChange to avoid recreating the editor on every parent re-render
export const RichTextEditor = memo(function RichTextEditor({ content, onChange, shopId }: RichTextEditorProps) {
  // Keep onChange in a ref so the editor's onUpdate closure never goes stale
  // and we never need to recreate the editor when the parent re-renders
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image,
      HorizontalRule,
      Placeholder.configure({ placeholder: 'Décrivez votre produit...' }),
    ],
    // Only set content on mount — never update it from props to avoid cursor jump
    content: content || undefined,
    onUpdate: ({ editor }) => {
      // Call via ref so this callback never changes → editor is never recreated
      onChangeRef.current(editor.getJSON() as Record<string, unknown>);
    },
    // Critical: editorProps to prevent scroll jump
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[200px] p-3',
      },
    },
  }, []); // Empty deps array = editor created once only

  const insertImage = useCallback((url: string) => {
    editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const insertLink = useCallback((url: string) => {
    editor?.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-input rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-1 border-b border-input bg-muted/30 relative">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
          <Strikethrough className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
          <AlignRight className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => setShowImageDialog((v) => !v)}>
          <ImageIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => setShowLinkDialog((v) => !v)} active={editor.isActive('link')}>
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolBtn>

        {showImageDialog && (
          <ImageUploadDialog
            shopId={shopId}
            onInsert={insertImage}
            onClose={() => setShowImageDialog(false)}
          />
        )}
        {showLinkDialog && (
          <LinkDialog
            onInsert={insertLink}
            onClose={() => setShowLinkDialog(false)}
          />
        )}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:p-3 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
});
