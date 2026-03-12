import { useState, useRef } from 'react';
import { Bug, Lightbulb, Star, HelpCircle, X, Loader2, ImageIcon } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const FEEDBACK_TYPES = [
  {
    value: 'bug',
    label: 'Bug',
    emoji: '🐞',
    titlePlaceholder: 'Quel bug avez-vous rencontré ?',
    messagePlaceholder: 'Décrivez les étapes pour reproduire le bug...',
  },
  {
    value: 'feature',
    label: 'Fonctionnalité',
    emoji: '💡',
    titlePlaceholder: 'Quelle fonctionnalité souhaitez-vous ?',
    messagePlaceholder: 'Décrivez votre idée en détail...',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    emoji: '⭐',
    titlePlaceholder: 'Résumé de votre avis',
    messagePlaceholder: 'Partagez votre expérience...',
  },
  {
    value: 'question',
    label: 'Question',
    emoji: '❓',
    titlePlaceholder: 'Votre question',
    messagePlaceholder: 'Posez votre question...',
  },
] as const;

const feedbackSchema = z.object({
  title: z.string().trim().min(3, 'Titre requis (min 3 caractères)').max(200),
  message: z.string().trim().min(10, 'Message requis (min 10 caractères)').max(2000),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return ua.slice(0, 50);
}

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

interface FeedbackPanelProps {
  onClose: () => void;
}

export default function FeedbackPanel({ onClose }: FeedbackPanelProps) {
  const { user } = useAuth();
  const { shop } = useShop();
  const { toast } = useToast();
  const [type, setType] = useState<string>('feedback');
  const [submitting, setSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentType = FEEDBACK_TYPES.find((ft) => ft.value === type) || FEEDBACK_TYPES[2];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux', description: 'Maximum 5 Mo', variant: 'destructive' });
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast({ title: 'Format non supporté', description: 'PNG, JPG ou WEBP uniquement', variant: 'destructive' });
      return;
    }
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onSubmit = async (data: FeedbackForm) => {
    if (!user) return;
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;

      if (screenshot) {
        const ext = screenshot.name.split('.').pop() || 'png';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('feedback-screenshots')
          .upload(path, screenshot, { contentType: screenshot.type });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('feedback-screenshots').getPublicUrl(path);
        screenshot_url = urlData.publicUrl;
      }

      const { error } = await supabase.from('feedbacks').insert({
        user_id: user.id,
        store_id: shop?.id || null,
        type,
        title: data.title,
        message: data.message,
        page_url: window.location.href,
        browser: getBrowserInfo(),
        device: getDeviceType(),
        screenshot_url,
      });

      if (error) throw error;

      toast({ title: '✅ Merci pour votre feedback !', description: 'Nous examinerons votre message rapidement.' });
      onClose();
    } catch (err) {
      console.error('[FeedbackPanel] error:', err);
      toast({ title: 'Erreur', description: "Impossible d'envoyer le feedback. Réessayez.", variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Envoyer un feedback</h3>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable content */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Type selector */}
        <div className="grid grid-cols-2 gap-1.5">
          {FEEDBACK_TYPES.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setType(ft.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all',
                type === ft.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="text-sm">{ft.emoji}</span>
              <span>{ft.label}</span>
            </button>
          ))}
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="fb-title" className="text-xs">Titre</Label>
          <Input
            id="fb-title"
            {...register('title')}
            placeholder={currentType.titlePlaceholder}
            className="mt-1 h-9 text-sm"
          />
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
        </div>

        {/* Message */}
        <div>
          <Label htmlFor="fb-message" className="text-xs">Message</Label>
          <Textarea
            id="fb-message"
            {...register('message')}
            placeholder={currentType.messagePlaceholder}
            className="mt-1 min-h-[100px] resize-y text-sm"
          />
          {errors.message && <p className="text-xs text-destructive mt-1">{errors.message.message}</p>}
        </div>

        {/* Screenshot */}
        <div>
          {screenshotPreview ? (
            <div className="relative inline-block">
              <img
                src={screenshotPreview}
                alt="Aperçu"
                className="h-16 w-auto rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={removeScreenshot}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Ajouter une capture (max 5 Mo)</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-[10px] text-sm font-semibold"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Envoyer'}
        </Button>
      </form>
    </div>
  );
}
