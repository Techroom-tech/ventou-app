import { lazy, Suspense, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const FeedbackModal = lazy(() => import('./FeedbackModal'));

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Envoyer un feedback"
        className={cn(
          'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
          'h-12 w-12 rounded-full bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-150 hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      {open && (
        <Suspense fallback={null}>
          <FeedbackModal open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
