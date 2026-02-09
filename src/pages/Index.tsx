import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ArrowRight, ShoppingBag, Shield, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">V</span>
            </div>
            <span className="text-xl font-bold text-foreground">VENTOU</span>
          </Link>
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
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="bg-accent hover:bg-accent/90">
                      {t('nav.signup')}
                    </Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            <span className="text-gradient-ventou">VENTOU</span>
            <br />
            Vendez en ligne simplement
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            La plateforme e-commerce conçue pour les vendeurs d'Afrique de l'Ouest. 
            Créez votre boutique, gérez vos produits, acceptez Mobile Money.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link to={user ? "/dashboard" : "/signup"}>
              <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-lg px-8">
                {user ? t('nav.dashboard') : 'Commencer gratuitement'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
              Voir une démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Pourquoi choisir VENTOU ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <ShoppingBag className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Boutique personnalisée</h3>
              <p className="text-muted-foreground">
                Créez votre boutique avec votre propre URL : nom.ventou.shop
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurité renforcée</h3>
              <p className="text-muted-foreground">
                Authentification 2FA, protection des données, paiements sécurisés
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Mobile Money</h3>
              <p className="text-muted-foreground">
                Acceptez Orange Money et autres paiements mobiles populaires
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{t('footer.copyright')}</p>
          <div className="flex gap-6">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.about')}
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.terms')}
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('footer.contact')}
            </Link>
          </div>
        </div>
      </footer>

      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default Index;
