import { useParams } from 'react-router-dom';
import ShopStorefront from './ShopStorefront';

export default function ShopStorefrontRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return null;
  return <ShopStorefront slug={slug} />;
}
