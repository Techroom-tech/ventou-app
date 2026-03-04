import { useNavigate } from 'react-router-dom';
import {
  Store, Globe, Palette, Truck, CreditCard, Tag,
  Search, BarChart2, Bell, Headphones, User, Users,
  Receipt, Code2, ChevronRight, Settings2,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface SettingCard {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  path: string;
  badge?: string;
  disabled?: boolean;
}

interface SettingSection {
  title: string;
  cards: SettingCard[];
}

const sections: SettingSection[] = [
  {
    title: 'Boutique',
    cards: [
      {
        icon: Store,
        iconBg: 'bg-orange-100 dark:bg-orange-950',
        iconColor: 'text-orange-600 dark:text-orange-400',
        title: 'Identité',
        description: 'Nom, description, ville, pays et devise',
        path: '/dashboard/parametres/identite',
      },
      {
        icon: Globe,
        iconBg: 'bg-blue-100 dark:bg-blue-950',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Domaine',
        description: 'URL publique et sous-domaine boutique',
        path: '/dashboard/parametres/domaine',
      },
      {
        icon: Palette,
        iconBg: 'bg-purple-100 dark:bg-purple-950',
        iconColor: 'text-purple-600 dark:text-purple-400',
        title: 'Apparence',
        description: 'Logo, bannière et couleur principale',
        path: '/dashboard/parametres/apparence',
      },
    ],
  },
  {
    title: 'Vente & Livraison',
    cards: [
      {
        icon: Truck,
        iconBg: 'bg-green-100 dark:bg-green-950',
        iconColor: 'text-green-600 dark:text-green-400',
        title: 'Livraison',
        description: 'Frais, zones et délais de livraison',
        path: '/dashboard/parametres/livraison',
      },
      {
        icon: CreditCard,
        iconBg: 'bg-blue-100 dark:bg-blue-950',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Paiement',
        description: 'COD, WhatsApp et modes de paiement',
        path: '/dashboard/parametres/paiement',
      },
      {
        icon: Tag,
        iconBg: 'bg-pink-100 dark:bg-pink-950',
        iconColor: 'text-pink-600 dark:text-pink-400',
        title: 'Codes promo',
        description: 'Créer et gérer vos codes de réduction',
        path: '/dashboard/parametres/codes-promo',
        badge: 'Nouveau',
      },
    ],
  },
  {
    title: 'Marketing',
    cards: [
      {
        icon: Search,
        iconBg: 'bg-indigo-100 dark:bg-indigo-950',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        title: 'SEO',
        description: 'Titre, description et image pour les moteurs de recherche',
        path: '/dashboard/parametres/seo',
      },
      {
        icon: BarChart2,
        iconBg: 'bg-orange-100 dark:bg-orange-950',
        iconColor: 'text-orange-600 dark:text-orange-400',
        title: 'Pixels & Tracking',
        description: 'Facebook Pixel, TikTok, Google Tag Manager',
        path: '/dashboard/parametres/pixels',
      },
    ],
  },
  {
    title: 'Communication',
    cards: [
      {
        icon: Bell,
        iconBg: 'bg-yellow-100 dark:bg-yellow-950',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        title: 'Notifications',
        description: 'Alertes email et Telegram pour les commandes',
        path: '/dashboard/parametres/notifications',
      },
      {
        icon: Headphones,
        iconBg: 'bg-teal-100 dark:bg-teal-950',
        iconColor: 'text-teal-600 dark:text-teal-400',
        title: 'Support',
        description: 'Assistance et contact Ventou',
        path: '/dashboard/parametres/support',
      },
    ],
  },
  {
    title: 'Compte',
    cards: [
      {
        icon: User,
        iconBg: 'bg-blue-100 dark:bg-blue-950',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Profil',
        description: 'Prénom, nom et avatar du compte',
        path: '/dashboard/parametres/profil',
      },
      {
        icon: Users,
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground',
        title: 'Équipe',
        description: 'Gérer les membres et les accès',
        path: '/dashboard/parametres/equipe',
        badge: 'Bientôt',
        disabled: true,
      },
      {
        icon: Receipt,
        iconBg: 'bg-muted',
        iconColor: 'text-muted-foreground',
        title: 'Facturation',
        description: 'Abonnement, factures et paiements',
        path: '/dashboard/parametres/facturation',
        badge: 'Bientôt',
        disabled: true,
      },
    ],
  },
  {
    title: 'Développeur',
    cards: [
      {
        icon: Code2,
        iconBg: 'bg-foreground/10',
        iconColor: 'text-foreground',
        title: 'API',
        description: 'Clé publique et accès API boutique',
        path: '/dashboard/parametres/api',
      },
    ],
  },
];

function SettingCardItem({ card }: { card: SettingCard }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => !card.disabled && navigate(card.path)}
      className={cn(
        'group flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all duration-200',
        card.disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-md hover:border-primary/30 hover:bg-secondary/30'
      )}
    >
      {/* Icon */}
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', card.iconBg)}>
        <card.icon className={cn('h-5 w-5 icon-interactive', card.iconColor)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{card.title}</span>
          {card.badge && (
            <span
              className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                card.badge === 'Bientôt'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-accent/15 text-accent'
              )}
            >
              {card.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.description}</p>
      </div>

      {/* Arrow */}
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-200',
          card.disabled ? 'text-muted-foreground/40' : 'text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5'
        )}
      />
    </div>
  );
}

export default function SettingsHub() {
  return (
    <>
      <div className="max-w-4xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
            <p className="text-sm text-muted-foreground">Configurez votre boutique et votre compte</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.cards.map((card) => (
                  <SettingCardItem key={card.path} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
