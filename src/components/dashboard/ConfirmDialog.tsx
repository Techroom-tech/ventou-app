import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2, Truck, XCircle, Trash2, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'confirm' | 'deliver' | 'cancel' | 'delete' | 'warning';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  actionClass: string;
}> = {
  confirm: {
    icon: CheckCircle2,
    iconBg: 'bg-[hsl(142,76%,36%)]/10',
    iconColor: 'text-[hsl(142,76%,36%)]',
    actionClass: 'bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)] text-white',
  },
  deliver: {
    icon: Truck,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    actionClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  },
  cancel: {
    icon: XCircle,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    actionClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  },
  delete: {
    icon: Trash2,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    actionClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-[hsl(38,92%,50%)]/10',
    iconColor: 'text-[hsl(38,92%,50%)]',
    actionClass: 'bg-[hsl(38,92%,50%)] hover:bg-[hsl(38,92%,45%)] text-white',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'confirm',
  loading = false,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-[380px] p-0 gap-0 border-border shadow-xl">
        {/* Icon + Text */}
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-4 space-y-3">
          <div className={cn(
            'flex items-center justify-center w-14 h-14 rounded-2xl transition-transform',
            config.iconBg,
          )}>
            <Icon className={cn('h-7 w-7', config.iconColor)} strokeWidth={1.8} />
          </div>

          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Actions */}
        <AlertDialogFooter className="flex-col gap-2 px-6 pb-6 pt-2 sm:flex-col sm:space-x-0">
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'w-full h-11 rounded-xl text-sm font-semibold transition-all',
              config.actionClass,
              loading && 'opacity-70 pointer-events-none',
            )}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Traitement…
              </span>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>

          <AlertDialogCancel
            className="w-full h-11 rounded-xl text-sm font-medium border-border mt-0"
          >
            {cancelLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
