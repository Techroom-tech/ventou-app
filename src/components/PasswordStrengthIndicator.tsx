import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface PasswordStrengthIndicatorProps {
  password: string;
}

function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const strengthConfig = [
  { label: 'auth.passwordStrength.weak', color: 'bg-destructive', width: '25%' },
  { label: 'auth.passwordStrength.fair', color: 'bg-orange-500', width: '50%' },
  { label: 'auth.passwordStrength.good', color: 'bg-yellow-500', width: '75%' },
  { label: 'auth.passwordStrength.strong', color: 'bg-ventou-success', width: '100%' },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation();
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  const config = strengthConfig[strength - 1] ?? strengthConfig[0];

  return (
    <div className="space-y-1.5 mt-2">
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${config.color}`}
          initial={{ width: 0 }}
          animate={{ width: config.width }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t(config.label)}
      </p>
    </div>
  );
}
