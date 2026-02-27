export interface TimeGreeting {
  text: string;
  textEn: string;
  emoji: string;
}

export function getTimeGreeting(): TimeGreeting {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { text: 'Bonjour', textEn: 'Good morning', emoji: '🌅' };
  }
  if (hour >= 12 && hour < 14) {
    return { text: 'Bon midi', textEn: 'Good afternoon', emoji: '☀️' };
  }
  if (hour >= 14 && hour < 18) {
    return { text: 'Bon après-midi', textEn: 'Good afternoon', emoji: '🌤' };
  }
  if (hour >= 18 && hour < 22) {
    return { text: 'Bonsoir', textEn: 'Good evening', emoji: '🌙' };
  }
  return { text: 'Bonne nuit', textEn: 'Good night', emoji: '🌜' };
}
