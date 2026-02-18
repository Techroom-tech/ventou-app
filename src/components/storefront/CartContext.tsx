import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { Product } from '@/types/shop';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getStorageKey(shopId: string) {
  return `ventou-cart-${shopId}`;
}

function loadFromStorage(shopId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(shopId));
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

function saveToStorage(shopId: string, items: CartItem[]) {
  try {
    localStorage.setItem(getStorageKey(shopId), JSON.stringify(items));
  } catch {
    // storage quota exceeded — ignore
  }
}

interface CartProviderProps {
  children: ReactNode;
  shopId: string;
}

export function CartProvider({ children, shopId }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage(shopId));

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(shopId, items);
  }, [shopId, items]);

  const addToCart = useCallback((product: Product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.product.id !== productId));
      return;
    }
    setItems(prev =>
      prev.map(i => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const cartTotal = useMemo(() => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
