import { useEffect } from 'react';
import { Product, Shop } from '@/types/shop';

interface ProductSEOProps {
  product: Product;
  shop: Shop;
  mainImage: string | null;
}

export default function ProductSEO({ product, shop, mainImage }: ProductSEOProps) {
  useEffect(() => {
    const url = window.location.href;
    const image = mainImage || product.image_url || '';
    const description = product.meta_description || shop.description || product.name;
    const currency = shop.currency || 'XOF';
    const availability = product.track_stock && product.stock_quantity === 0 ? 'OutOfStock' : 'InStock';

    // JSON-LD
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.meta_title || product.name,
      description,
      image: image ? [image] : [],
      brand: { '@type': 'Brand', name: shop.name },
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: currency,
        price: product.price,
        availability: `https://schema.org/${availability}`,
        seller: { '@type': 'Organization', name: shop.name },
      },
    };

    let scriptEl = document.getElementById('ventou-product-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'ventou-product-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    // Meta tags
    const metas: Record<string, string> = {
      'og:title': product.meta_title || product.name,
      'og:description': description,
      'og:image': image,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:url': url,
      'og:type': 'product',
      'twitter:card': 'summary_large_image',
      'twitter:title': product.meta_title || product.name,
      'twitter:description': description,
      'twitter:image': image,
    };

    const createdEls: HTMLMetaElement[] = [];
    for (const [property, content] of Object.entries(metas)) {
      if (!content) continue;
      const attr = property.startsWith('twitter:') ? 'name' : 'property';
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, property);
        document.head.appendChild(el);
        createdEls.push(el);
      }
      el.setAttribute('content', content);
    }

    // Title
    const origTitle = document.title;
    document.title = `${product.name} — ${shop.name}`;

    return () => {
      document.getElementById('ventou-product-jsonld')?.remove();
      createdEls.forEach(el => el.remove());
      document.title = origTitle;
    };
  }, [product, shop, mainImage]);

  return null;
}
