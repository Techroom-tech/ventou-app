export interface TimeGreeting {
  text: string;
  textEn: string;
  emoji: string;
  subtitle: string;
  subtitleEn: string;
}

export function getTimeGreeting(): TimeGreeting {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { text: 'Bonjour', textEn: 'Good morning', emoji: '🌅', subtitle: 'Commencez la journée en beauté — vérifiez vos commandes du matin !', subtitleEn: 'Start the day right — check your morning orders!' };
  }
  if (hour >= 12 && hour < 14) {
    return { text: 'Bon midi', textEn: 'Good afternoon', emoji: '☀️', subtitle: 'Profitez de la pause pour optimiser votre boutique.', subtitleEn: 'Use the break to optimize your shop.' };
  }
  if (hour >= 14 && hour < 18) {
    return { text: 'Bon après-midi', textEn: 'Good afternoon', emoji: '🌤', subtitle: "C'est l'heure de pointe — lancez cette campagne que vous planifiez !", subtitleEn: "Peak hours — launch that campaign you've been planning!" };
  }
  if (hour >= 18 && hour < 22) {
    return { text: 'Bonsoir', textEn: 'Good evening', emoji: '🌙', subtitle: 'Bilan de la journée — voyez comment vos ventes ont performé.', subtitleEn: 'Day recap — see how your sales performed.' };
  }
  return { text: 'Bonne nuit', textEn: 'Good night', emoji: '🌜', subtitle: 'Reposez-vous, votre boutique travaille pour vous.', subtitleEn: 'Rest easy, your shop is working for you.' };
}
