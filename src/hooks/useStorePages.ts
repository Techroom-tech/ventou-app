import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { toast } from 'sonner';

export interface StorePage {
  id: string;
  shop_id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  content: Record<string, unknown> | null;
  status: 'published' | 'draft';
  page_type: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_PAGES = [
  { slug: 'about', title: 'À propos', description: 'Présentez votre boutique et votre histoire', icon: 'Info', page_type: 'about' },
  { slug: 'privacy', title: 'Politique de confidentialité', description: 'Informations sur la collecte de données', icon: 'Shield', page_type: 'privacy' },
  { slug: 'legal', title: 'Mentions légales', description: 'Informations juridiques obligatoires', icon: 'Scale', page_type: 'legal' },
  { slug: 'terms', title: 'Conditions générales', description: 'Conditions d\'utilisation et de vente', icon: 'FileText', page_type: 'terms' },
  { slug: 'faq', title: 'FAQ', description: 'Questions fréquentes (max 5)', icon: 'HelpCircle', page_type: 'faq' },
  { slug: 'contact', title: 'Contact', description: 'Coordonnées et formulaire de contact', icon: 'Mail', page_type: 'contact' },
] as const;

export const ALL_DYNAMIC_TAGS = [
  { label: 'Nom de la boutique', tag: '{{storeName}}' },
  { label: 'URL de la boutique', tag: '{{storeUrl}}' },
  { label: 'Nom du propriétaire', tag: '{{ownerName}}' },
  { label: 'Email de contact', tag: '{{contactEmail}}' },
  { label: 'Téléphone', tag: '{{storePhone}}' },
  { label: 'Dernière mise à jour', tag: '{{lastUpdatedDate}}' },
  { label: 'Ville', tag: '{{storeCity}}' },
  { label: 'Pays', tag: '{{storeCountry}}' },
  { label: 'Devise', tag: '{{storeCurrency}}' },
  { label: 'Catégorie boutique', tag: '{{storeCategory}}' },
  { label: 'Année en cours', tag: '{{currentYear}}' },
  { label: 'Description boutique', tag: '{{storeDescription}}' },
  { label: 'WhatsApp', tag: '{{storeWhatsApp}}' },
] as const;

const TAGS_BY_PAGE_TYPE: Record<string, string[]> = {
  about: ['{{storeName}}', '{{ownerName}}', '{{storeCity}}', '{{storeCountry}}', '{{contactEmail}}', '{{storePhone}}', '{{storeDescription}}'],
  privacy: ['{{storeName}}', '{{contactEmail}}', '{{storeUrl}}', '{{storeCountry}}', '{{lastUpdatedDate}}', '{{currentYear}}'],
  legal: ['{{storeName}}', '{{ownerName}}', '{{storeUrl}}', '{{storeCity}}', '{{storeCountry}}', '{{storePhone}}', '{{currentYear}}'],
  terms: ['{{storeName}}', '{{storeUrl}}', '{{storeCity}}', '{{storePhone}}', '{{lastUpdatedDate}}', '{{storeCurrency}}', '{{currentYear}}'],
  faq: ['{{storeName}}', '{{storePhone}}', '{{storeWhatsApp}}', '{{contactEmail}}'],
  contact: ['{{storeName}}', '{{storePhone}}', '{{storeWhatsApp}}', '{{contactEmail}}', '{{storeCity}}', '{{storeCountry}}', '{{storeUrl}}'],
};

export function getTagsForPageType(pageType: string) {
  const allowed = TAGS_BY_PAGE_TYPE[pageType] ?? Object.values(TAGS_BY_PAGE_TYPE).flat();
  return ALL_DYNAMIC_TAGS.filter((t) => allowed.includes(t.tag));
}

/** @deprecated Use getTagsForPageType instead */
export const DYNAMIC_TAGS = ALL_DYNAMIC_TAGS;

export function getDefaultTemplate(pageType: string): Record<string, unknown> {
  const templates: Record<string, Record<string, unknown>> = {
    about: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'À propos de {{storeName}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Bienvenue chez {{storeName}} ! Nous sommes basés à {{storeCity}}, {{storeCountry}}.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Notre mission est de vous offrir des produits de qualité avec un service client irréprochable.' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Pour toute question, contactez-nous au {{storePhone}} ou via WhatsApp au {{storeWhatsApp}}.' }] },
      ],
    },
    privacy: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Politique de confidentialité' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dernière mise à jour : {{lastUpdatedDate}}' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Collecte des données' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '{{storeName}} collecte les informations que vous nous fournissez lors de vos commandes : nom, numéro de téléphone, adresse de livraison.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Utilisation des données' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Vos données sont utilisées exclusivement pour traiter vos commandes et améliorer votre expérience sur {{storeName}}.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Contact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Pour exercer vos droits, contactez-nous au {{storePhone}}.' }] },
      ],
    },
    legal: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Mentions légales' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Éditeur du site' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '{{storeName}} — {{storeCity}}, {{storeCountry}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Responsable : {{ownerName}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Téléphone : {{storePhone}}' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hébergement' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ce site est hébergé par Ventou ({{storeUrl}}).' }] },
      ],
    },
    terms: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Conditions Générales de Vente' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Dernière mise à jour : {{lastUpdatedDate}}' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Objet' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Les présentes conditions régissent les ventes effectuées sur {{storeName}} ({{storeUrl}}).' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Commandes' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Toute commande passée sur {{storeName}} implique l\'acceptation des présentes conditions.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Livraison' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Les livraisons sont effectuées à {{storeCity}} et environs. Pour plus d\'informations, contactez-nous au {{storePhone}}.' }] },
      ],
    },
    faq: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Questions Fréquentes' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Comment passer une commande ?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ajoutez les produits au panier, remplissez vos coordonnées et validez. Vous recevrez une confirmation par WhatsApp.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Quels sont les modes de paiement ?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '{{storeName}} accepte le paiement à la livraison (COD) et via WhatsApp.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Combien coûte la livraison ?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Les frais de livraison dépendent de votre zone. Contactez-nous au {{storePhone}} pour plus de détails.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Comment contacter {{storeName}} ?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Vous pouvez nous joindre par WhatsApp au {{storeWhatsApp}} ou par téléphone au {{storePhone}}.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Quelle est votre politique de retour ?' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Contactez-nous dans les 24h suivant la réception pour tout problème avec votre commande.' }] },
      ],
    },
    contact: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Contactez-nous' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'N\'hésitez pas à nous contacter pour toute question ou information.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Coordonnées' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 {{storeCity}}, {{storeCountry}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📞 {{storePhone}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '💬 WhatsApp : {{storeWhatsApp}}' }] },
      ],
    },
  };
  return templates[pageType] ?? templates.about;
}

export function useStorePages() {
  const { shop } = useShop();
  const queryClient = useQueryClient();
  const shopId = shop?.id;

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['store-pages', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_pages')
        .select('*')
        .eq('shop_id', shopId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as StorePage[];
    },
    enabled: !!shopId,
  });

  const upsertPage = useMutation({
    mutationFn: async (page: Partial<StorePage> & { shop_id: string; slug: string; title: string }) => {
      const { data, error } = await supabase
        .from('store_pages')
        .upsert({ ...page, updated_at: new Date().toISOString() }, { onConflict: 'shop_id,slug' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pages', shopId] });
      toast.success('Page sauvegardée');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from('store_pages').delete().eq('id', pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pages', shopId] });
      toast.success('Page supprimée');
    },
  });

  return { pages, isLoading, upsertPage, deletePage, shopId };
}

// Replace dynamic tags with actual store data
export function replaceTags(
  content: Record<string, unknown>,
  store: {
    name?: string;
    slug?: string;
    city?: string;
    country?: string;
    whatsapp?: string;
    currency?: string;
    category?: string;
    description?: string;
    ownerName?: string;
    contactEmail?: string;
  }
): Record<string, unknown> {
  const now = new Date();
  const tagMap: Record<string, string> = {
    '{{storeName}}': store.name ?? '',
    '{{storeUrl}}': store.slug ? `${store.slug}.ventou.shop` : '',
    '{{ownerName}}': store.ownerName ?? '',
    '{{contactEmail}}': store.contactEmail ?? '',
    '{{storePhone}}': store.whatsapp ?? '',
    '{{lastUpdatedDate}}': now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }),
    '{{storeCity}}': store.city ?? '',
    '{{storeCountry}}': store.country ?? '',
    '{{storeCurrency}}': store.currency ?? 'XOF',
    '{{storeCategory}}': store.category ?? '',
    '{{currentYear}}': String(now.getFullYear()),
    '{{storeDescription}}': store.description ?? '',
    '{{storeWhatsApp}}': store.whatsapp ?? '',
  };

  const replaceInString = (s: string): string => {
    let result = s;
    for (const [tag, value] of Object.entries(tagMap)) {
      result = result.split(tag).join(value);
    }
    return result;
  };

  const replaceInNode = (node: unknown): unknown => {
    if (typeof node === 'string') return replaceInString(node);
    if (Array.isArray(node)) return node.map(replaceInNode);
    if (node && typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        result[k] = replaceInNode(v);
      }
      return result;
    }
    return node;
  };

  return replaceInNode(content) as Record<string, unknown>;
}
