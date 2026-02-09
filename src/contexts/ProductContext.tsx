import { createContext, useContext, useState, ReactNode } from 'react';
import { Product } from '@/types/shop';
import { mockProducts } from '@/data/mockData';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  toggleVisibility: (id: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);

  const addProduct = (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const duplicateProduct = (id: string) => {
    const original = products.find((p) => p.id === id);
    if (!original) return;
    const now = new Date().toISOString();
    const copy: Product = {
      ...original,
      id: `prod-${Date.now()}`,
      name: `${original.name} (copie)`,
      created_at: now,
      updated_at: now,
    };
    setProducts((prev) => [copy, ...prev]);
  };

  const toggleVisibility = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active, updated_at: new Date().toISOString() } : p))
    );
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, duplicateProduct, toggleVisibility }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProducts must be used within ProductProvider');
  return ctx;
}
