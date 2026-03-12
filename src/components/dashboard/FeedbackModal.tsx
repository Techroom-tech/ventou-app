import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, Lightbulb, Star, HelpCircle, Upload, X, Loader2, ImageIcon } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug', icon: Bug, emoji: '🐞' },
  { value: 'feature', label: 'Fonctionnalité', icon: Lightbulb, emoji: '💡' },
  { value: 'feedback', label: 'Feedback', icon: Star, emoji: '⭐' },
  { value: 'question', label: 'Question', icon: HelpCircle, emoji: '❓' },
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

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FeedbackFormContent({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const { shop } = useShop();
  const { toast } = useToast();
  const [type, setType] = useState<string>('feedback');
  const [submitting, setSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      onSuccess();
    } catch (err) {
      console.error('[FeedbackModal] error:', err);
      toast({ title: 'Erreur', description: "Impossible d'envoyer le feedback. Réessayez.", variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type selector */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Type de feedback</Label>
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_TYPES.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setType(ft.value)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                type === ft.value
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="text-base">{ft.emoji}</span>
              <span>{ft.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="fb-title">Titre</Label>
        <Input
          id="fb-title"
          {...register('title')}
          placeholder="Résumez votre message"
          className="mt-1"
        />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
      </div>

      {/* Message */}
      <div>
        <Label htmlFor="fb-message">Message</Label>
        <Textarea
          id="fb-message"
          {...register('message')}
          placeholder="Décrivez votre problème ou suggestion..."
          className="mt-1 min-h-[120px] resize-y"
        />
        {errors.message && <p className="text-xs text-destructive mt-1">{errors.message.message}</p>}
      </div>

      {/* Screenshot */}
      <div>
        <Label className="text-xs text-muted-foreground">Capture d'écran (optionnel)</Label>
        {screenshotPreview ? (
          <div className="relative mt-1 inline-block">
            <img
              src={screenshotPreview}
              alt="Aperçu"
              className="h-20 w-auto rounded-lg border object-cover"
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
            className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Ajouter une capture (PNG, JPG, WEBP — max 5 Mo)</span>
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

      {/* Context info badge */}
      <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
        <span className="bg-muted px-2 py-0.5 rounded-full">{getDeviceType()}</span>
        <span className="bg-muted px-2 py-0.5 rounded-full">{getBrowserInfo()}</span>
        {shop?.name && <span className="bg-muted px-2 py-0.5 rounded-full">{shop.name}</span>}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={submitting} className="w-full h-11 gap-2">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Envoyer
      </Button>
    </form>
  );
}

export default function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const isMobile = useIsMobile();

  const handleSuccess = () => {
    onOpenChange(false);
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader>
            <DrawerTitle>Envoyer un feedback</DrawerTitle>
            <DrawerDescription>Signalez un bug, suggérez une fonctionnalité ou partagez votre avis.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto flex-1">
            <FeedbackFormContent onSuccess={handleSuccess} onClose={() => onOpenChange(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle>Envoyer un feedback</DialogTitle>
          <DialogDescription>Signalez un bug, suggérez une fonctionnalité ou partagez votre avis.</DialogDescription>
        </DialogHeader>
        <FeedbackFormContent onSuccess={handleSuccess} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
