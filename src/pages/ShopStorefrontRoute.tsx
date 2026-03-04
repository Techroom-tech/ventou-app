import { useParams, useLocation } from 'react-router-dom';
import { StorefrontProvider } from '@/contexts/StorefrontContext';
import ShopStorefront from './ShopStorefront';

export default function ShopStorefrontRoute() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  if (!slug) return null;

  const basePath = location.pathname.startsWith('/shop/') ? `/shop/${slug}` : `/boutique/${slug}`;

  return (
    <StorefrontProvider routeSlug={slug}>
      <ShopStorefront slug={slug} basePath={basePath} />
    </StorefrontProvider>
  );
}
