import { useParams } from 'react-router-dom';
import { StorefrontProvider } from '@/contexts/StorefrontContext';
import ShopStorefront from './ShopStorefront';

export default function ShopStorefrontRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return null;
  return (
    <StorefrontProvider routeSlug={slug}>
      <ShopStorefront slug={slug} />
    </StorefrontProvider>
  );
}
