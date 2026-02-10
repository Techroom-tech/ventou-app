import { ShoppingCart } from 'lucide-react';
import { useCart } from './CartContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CartButtonProps {
  onClick: () => void;
}

export default function CartButton({ onClick }: CartButtonProps) {
  const { cartCount } = useCart();

  if (cartCount === 0) return null;

  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg animate-fade-in"
    >
      <ShoppingCart className="h-6 w-6" />
      <span
        className={cn(
          'absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold',
          cartCount > 9 ? 'h-6 w-6' : 'h-5 w-5'
        )}
      >
        {cartCount > 99 ? '99+' : cartCount}
      </span>
    </Button>
  );
}
