import { useState, useCallback } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import FeedbackPanel from './FeedbackPanel';

// Preload on hover
let preloaded = false;
function preload() {
  if (!preloaded) {
    preloaded = true;
    import('./FeedbackPanel');
  }
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleClose = useCallback(() => setOpen(false), []);

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          onMouseEnter={preload}
          onTouchStart={preload}
          aria-label="Envoyer un feedback"
          className={cn(
            'fixed bottom-20 right-4 z-50',
            'h-12 w-12 rounded-full bg-primary text-primary-foreground',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-150 hover:scale-105 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90vh]">
            <FeedbackPanel onClose={handleClose} />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onMouseEnter={preload}
          aria-label="Envoyer un feedback"
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'h-12 w-12 rounded-full bg-primary text-primary-foreground',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-150 hover:scale-105 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="w-[400px] p-0 rounded-xl shadow-xl"
      >
        <FeedbackPanel onClose={handleClose} />
      </PopoverContent>
    </Popover>
  );
}
