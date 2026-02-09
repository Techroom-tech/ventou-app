import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  pageTitle?: string;
}

export const Header = ({ pageTitle }: HeaderProps) => {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">V</span>
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:inline">VENTOU</span>
        </Link>

        {/* Page Title (optional, centered) */}
        {pageTitle && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-foreground hidden md:block">
            {pageTitle}
          </h1>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {!isLoading && (
            user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  {t('nav.dashboard')}
                </Button>
              </Link>
            ) : (
              <Link to="/signup">
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  {t('nav.signup')}
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};
